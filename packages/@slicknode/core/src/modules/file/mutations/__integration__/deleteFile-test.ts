/**
 * Created by Ivo Meißner on 21.06.17.
 *
 */

/* eslint-disable no-unused-expressions */

import {
  executeWithModule,
  destroyTestContext,
  executeQueryRequest,
  createTestUser,
  buildModules,
} from '../../../../test/utils';

import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import Context from '../../../../context';
import fetch from 'node-fetch';
import { ErrorCode } from '../../../../errors';
import { Role } from '../../../../auth';

chai.use(chaiAsPromised);
const TEST_FILE = path.resolve(__dirname, './assets/testfile.txt');

const query = `mutation UploadMutation($input: createFileInput!) {
  createFile(input: $input) {
    uploadUrl
    file {
      id
      token
      name
      mimeType
      size
      url
    }
  }
}`;

const deleteMutation = `mutation DeleteMutation($input: deleteFileInput!) {
  deleteFile(input: $input) {
    node {
      id
    }
  }
}`;

describe('deleteFile', () => {
  let context: Context;
  let app: Function;
  let user: {
    [x: string]: any;
  };

  before((done) => {
    buildModules(path.join(__dirname, 'projects', 'file-test'))
      .then((testModules) => {
        executeWithModule(testModules, (testModule, testContext) => {
          app = testModule;
          context = testContext;

          createTestUser([Role.AUTHENTICATED, Role.ADMIN], testContext, {
            isAdmin: true,
            isStaff: true,
          })
            .then((testUser) => {
              user = testUser.user;

              done();
            })
            .catch(done);
        });
      })
      .catch(done);
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('does not allow delete for anonymous user', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(app, {
        query: deleteMutation,
        variables: {
          input: {
            token: 'someinvalidtoken',
          },
        },
      });

      expect(result.data.deleteFile).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.LOGIN_REQUIRED
      );
    }

    runTest().then(done).catch(done);
  });

  it('validates token', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query: deleteMutation,
          variables: {
            input: {
              token: 'invalidtoken',
            },
          },
        },
        user
      );

      expect(result.data.deleteFile).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.INPUT_VALIDATION_FAILED
      );
    }

    runTest().then(done).catch(done);
  });

  it('creates and deletes a private file successfully', async () => {
    const result = await executeQueryRequest(
      app,
      {
        query,
        variables: {
          input: {
            name: 'mytestfile.txt',
            mimeType: 'text/plain',
            isPublic: false,
          },
        },
      },
      user
    );

    expect(result.data).not.to.be.null;
    expect(result.data.createFile).not.to.be.null;

    const payload = result.data.createFile;
    expect(payload.file.mimeType).to.equal('text/plain');
    expect(payload.file.size).to.equal(null);
    expect(payload.uploadUrl).not.to.be.null;

    // Send file via PUT request
    const file = await promisify(fs.readFile)(TEST_FILE);
    const response = await fetch(payload.uploadUrl, {
      method: 'PUT',

      headers: {
        'Content-Length': String(file.length),
        'Content-Type': 'text/plain',
      },
      body: file,
    });
    expect(response.status).to.equal(200);

    // Retrieve content via file URL
    const savedFile = await fetch(payload.file.url);
    const content = await savedFile.text();

    expect(content).to.equal('Nothing to see here... just for test');

    // Check if file is protected when loaded without access keys
    const publicResponse = await fetch(payload.file.url.split('?')[0]);
    expect(publicResponse.status).to.equal(403);

    // Check if DB entry was created
    const dbFile1 = await context.db.File.find({
      id: context.fromGlobalId(payload.file.id).id,
    });
    expect(dbFile1).to.not.equal(null);

    // Delete file
    const deleteResult = await executeQueryRequest(
      app,
      {
        query: deleteMutation,
        variables: {
          input: {
            token: payload.file.token,
          },
        },
      },
      user
    );
    const node = deleteResult.data.deleteFile.node;
    expect(node.id).to.equal(payload.file.id);

    // Check if file was deleted from storage
    const deletedFile = await fetch(payload.file.url);
    expect(deletedFile.status).to.equal(404);

    // Check if DB entry was deleted
    const dbFile = await context.db.File.find({
      id: context.fromGlobalId(payload.file.id).id,
    });
    expect(dbFile).to.equal(null);
  });

  it('creates and deletes a public file successfully', async () => {
    const result = await executeQueryRequest(
      app,
      {
        query,
        variables: {
          input: {
            name: 'mytestfile.txt',
            mimeType: 'text/plain',
            isPublic: true,
          },
        },
      },
      user
    );

    expect(result.data).not.to.be.null;
    expect(result.data.createFile).not.to.be.null;

    const payload = result.data.createFile;
    expect(payload.file.mimeType).to.equal('text/plain');
    expect(payload.file.size).to.equal(null);
    expect(payload.uploadUrl).not.to.be.null;

    // Send file via PUT request
    const file = await promisify(fs.readFile)(TEST_FILE);
    const response = await fetch(payload.uploadUrl, {
      method: 'PUT',

      headers: {
        'Content-Length': String(file.length),
        'Content-Type': 'text/plain',
      },
      body: file,
    });
    expect(response.status).to.equal(200);

    // Retrieve content via file URL
    const savedFile = await fetch(payload.file.url);
    const content = await savedFile.text();

    expect(content).to.equal('Nothing to see here... just for test');

    // Check if file is public when loaded without access keys
    const publicResponse = await fetch(payload.file.url.split('?')[0]);
    expect(publicResponse.status).to.equal(200);

    // Check if DB entry was created
    const dbFile1 = await context.db.File.find({
      id: context.fromGlobalId(payload.file.id).id,
    });
    expect(dbFile1).to.not.equal(null);

    // Delete file
    const deleteResult = await executeQueryRequest(
      app,
      {
        query: deleteMutation,
        variables: {
          input: {
            token: payload.file.token,
          },
        },
      },
      user
    );
    const node = deleteResult.data.deleteFile.node;
    expect(node.id).to.equal(payload.file.id);

    // Wait for
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if file was deleted from storage
    const deletedFile = await fetch(payload.file.url);
    expect(deletedFile.status).to.equal(404);

    // Check if DB entry was deleted
    const dbFile = await context.db.File.find({
      id: context.fromGlobalId(payload.file.id).id,
    });
    expect(dbFile).to.equal(null);
  });

  after((done) => {
    destroyTestContext(context).then(done).catch(done);
  });
});
