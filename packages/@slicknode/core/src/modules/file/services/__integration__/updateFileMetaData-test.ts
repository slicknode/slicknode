import Context from '../../../../context';
import {
  createTestContext,
  createTestUser,
  destroyTestContext,
  executeQuery,
  TestUser,
} from '../../../../test/utils';
import { baseModules } from '../../../baseModules';
import { Role } from '../../../../auth';
import { promisify } from 'util';
import fs from 'fs';
import { expect } from 'chai';
import fetch from 'node-fetch';
import * as path from 'path';
import { updateFileMetaData } from '../updateFileMetaData';

const CREATE_FILE_MUTATION = `
mutation M($input: createFileInput!) {
  createFile(input: $input) {
    file {
      id
      mimeType
      url
    }
    uploadUrl
  }
}
`;

describe('updateFileMetaData service', () => {
  let context: Context;
  let user: TestUser;

  before(async () => {
    context = await createTestContext(baseModules);
    user = await createTestUser([Role.AUTHENTICATED], context);
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('update file metadata successfully form public file', async () => {
    const testFile = await promisify(fs.readFile)(
      path.resolve(__dirname, 'assets', 'testfile.txt')
    );
    const result = await executeQuery(
      CREATE_FILE_MUTATION,
      context,
      {
        input: {
          name: 'test-image.txt',
          mimeType: 'text/plain',
          isPublic: true,
        },
      },
      {
        authContext: user.auth,
      }
    );

    const data = result.createFile;
    expect(data.file.mimeType).to.equal('text/plain');
    expect(data.file.url).to.include('test-image.txt');

    // Send file via PUT request
    const response = await fetch(data.uploadUrl, {
      method: 'PUT',

      headers: {
        'Content-Length': String(testFile.length),
      },
      body: testFile,
    });
    expect(response.status).to.equal(200);

    // Get key from image
    let file = await context.db.File.find({
      id: context.fromGlobalId(data.file.id).id,
    });
    expect(file.size).to.equal(null);
    expect(file.uploadedAt).to.equal(null);

    // Update file metadata
    const updatedFile = await updateFileMetaData({
      key: file.key,
      context,
    });
    expect(updatedFile.id).to.equal(file.id);
    expect(updatedFile.uploadedAt).to.not.equal(null);

    // Reload file
    file = await context.db.File.find({
      id: file.id,
    });
    expect(file.size).to.equal(36);
    expect(file.uploadedAt).to.not.equal(null);
  });
});
