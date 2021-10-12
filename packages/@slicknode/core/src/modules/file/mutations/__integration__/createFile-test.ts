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
import { IUserAuthInfo } from '../../../../auth/utils';
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

describe('createFile', () => {
  let context: Context;
  let app: Function;
  let user: IUserAuthInfo;

  before((done) => {
    buildModules(path.join(__dirname, 'projects', 'file-test'))
      .then((testModules) => {
        executeWithModule(testModules, (testModule, testContext) => {
          app = testModule;
          context = testContext;

          createTestUser([Role.AUTHENTICATED], testContext)
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

  it('does not allow upload for anonymous user', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(app, {
        query,
        variables: {
          input: {
            name: 'mytestfile.txt',
            mimeType: 'text/plain',
            isPublic: false,
          },
        },
      });

      expect(result.data.createFile).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.LOGIN_REQUIRED
      );
    }

    runTest().then(done).catch(done);
  });

  it('validates mimeType', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {
              name: 'mytestfile.txt',
              mimeType: 'invalidmime',
              isPublic: false,
            },
          },
        },
        user
      );

      expect(result.data.createFile).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.INPUT_VALIDATION_FAILED
      );
      expect(result.errors[0].extensions.arguments).to.have.property('input');
      expect(result.errors[0].extensions.arguments.input[0].path).to.deep.equal(
        ['mimeType']
      );
    }

    runTest().then(done).catch(done);
  });

  it('validates file name', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {
              name: '"§%&.txt',
              mimeType: 'text/plain',
              isPublic: false,
            },
          },
        },
        user
      );

      expect(result.data.createFile).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.INPUT_VALIDATION_FAILED
      );
      expect(result.errors[0].extensions.arguments.input[0].path).to.deep.equal(
        ['name']
      );
    }

    runTest().then(done).catch(done);
  });

  it('creates and uploads a file successfully', (done) => {
    async function runTest() {
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
    }

    runTest().then(done).catch(done);
  });

  it('uses token in createNode mutations', async () => {
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
    expect(payload.file.token).to.be.string;
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

    const createMutation = `mutation M($token: String!) {
      createPost: Blog_createPost(input: {file: $token}) {
        node {
          id 
          file {
            url
          }
        }
      }
    }`;

    // Check if token matches user
    const createResult = await executeQueryRequest(app, {
      query: createMutation,
      variables: {
        token: payload.file.token,
      },
    });
    expect(createResult.errors.length).to.equal(1);
    expect(createResult.errors[0].message).to.include('Invalid file token');

    // Check if token matches user
    const createResult2 = await executeQueryRequest(
      app,
      {
        query: createMutation,
        variables: {
          token: payload.file.token,
        },
      },
      user
    );
    expect(createResult2.errors).to.be.undefined;

    expect(createResult2.data.createPost.node.file.url).to.be.string;
    // Retrieve content via file URL
    const savedFile = await fetch(createResult2.data.createPost.node.file.url);
    const content = await savedFile.text();

    expect(content).to.equal('Nothing to see here... just for test');
  });

  it('uses token in updateNode mutations', async () => {
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
    expect(payload.file.token).to.be.string;
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

    const createMutation = `mutation M($token: String) {
      createPost: Blog_createPost(input: {file: $token}) {
        node {
          id 
          file {
            url
          }
        }
      }
    }`;

    // Create node
    const createResult2 = await executeQueryRequest(
      app,
      {
        query: createMutation,
        variables: {
          token: null,
        },
      },
      user
    );
    expect(createResult2.errors).to.be.undefined;

    expect(createResult2.data.createPost.node.file).to.be.null;

    const updateMutation = `mutation M($token: String!, $id: ID!) {
      updatePost: Blog_updatePost(input: {id: $id, file: $token}) {
        node {
          file {
            url
          }
        }
      }
    }`;

    // Check if token matches user
    const updateResult = await executeQueryRequest(
      app,
      {
        query: updateMutation,
        variables: {
          id: createResult2.data.createPost.node.id,
          token: payload.file.token,
        },
      },
      user
    );
    expect(updateResult.errors).to.be.undefined;

    // Retrieve content via file URL
    const savedFile = await fetch(updateResult.data.updatePost.node.file.url);
    const content = await savedFile.text();

    expect(content).to.equal('Nothing to see here... just for test');
  });

  it('does not return object via Query.node field', (done) => {
    async function runTest() {
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
      const nodeResult = await executeQueryRequest(
        app,
        {
          query: 'query NodeQuery($id: ID!) {node(id: $id) {id}}',
          variables: {
            id: payload.file.id,
          },
        },
        user
      );

      // Should not return node
      expect(nodeResult.data.node).to.equal(null);
    }

    runTest().then(done).catch(done);
  });

  it('does not create Query fields for direct access', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query: `{
          __schema {
            queryType {
              fields {
                name
              }
            }
          }
        }`,
        },
        user
      );

      expect(result.data).not.to.be.null;
      expect(result.data.__schema).not.to.be.null;
      expect(result.data.__schema.queryType.fields).to.be.an('array');

      const fieldNames = result.data.__schema.queryType.fields.map(
        (field) => field.name
      );
      expect(fieldNames.length).to.be.above(1);
      expect(fieldNames).to.not.include('getFileById');
      expect(fieldNames).to.not.include('listFile');
    }

    runTest().then(done).catch(done);
  });

  it('creates and uploads a public file successfully', (done) => {
    async function runTest() {
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

      // Check if file is protected when loaded without access keys
      const publicResponse = await fetch(payload.file.url.split('?')[0]);
      expect(publicResponse.status).to.equal(200);
    }

    runTest().then(done).catch(done);
  });

  it('can reload File via Query.getFileByToken', (done) => {
    async function runTest() {
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
      expect(payload.file.token).not.to.equal(null);
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

      const refetchQuery = `query RefetchFile($token: String!) {
        getFileByToken(token: $token) {
          id
          name
          mimeType
        }
      }`;

      const refetchResponse = await executeQueryRequest(
        app,
        {
          query: refetchQuery,
          variables: {
            token: payload.file.token,
          },
        },
        user
      );
      const fileNode = refetchResponse.data.getFileByToken;
      expect(fileNode.id).to.equal(payload.file.id);
      expect(fileNode.name).to.equal(payload.file.name);
      expect(fileNode.mimeType).to.equal(payload.file.mimeType);

      // Test if token is tied to user
      const testUser = await createTestUser([Role.AUTHENTICATED], context);
      const refetchResponse2 = await executeQueryRequest(
        app,
        {
          query: refetchQuery,
          variables: {
            token: payload.file.token,
          },
        },
        testUser.user
      );
      expect(refetchResponse2.data.getFileByToken).to.equal(null);
    }

    runTest().then(done).catch(done);
  });

  it('can create other node with token', async () => {
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
    expect(payload.file.token).not.to.equal(null);
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

    const result2 = await executeQueryRequest(
      app,
      {
        query: `mutation M(
        $input: Blog_createPostInput!
      ) {
        createPost: Blog_createPost(input: $input) {
          node {
            file {
              name
            }
          }
        }
      }`,
        variables: {
          input: {
            file: payload.file.token,
          },
        },
      },
      user
    );
    const node = result2.data.createPost.node;
    expect(node.file.name).to.equal('mytestfile.txt');
  });

  it('generates correct create mutation input types', async () => {
    // Check introspection for generated input mutation
    const introspectionResult = await executeQueryRequest(
      app,
      {
        query: `{
        __type(name: "Blog_createPostInput") {
          inputFields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }`,
      },
      user
    );
    expect(introspectionResult.data.__type.inputFields).to.deep.equal([
      {
        name: 'file',
        type: {
          kind: 'SCALAR',
          name: 'String',
          ofType: null,
        },
      },
    ]);
  });

  after((done) => {
    destroyTestContext(context).then(done).catch(done);
  });
});
