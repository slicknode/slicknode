import Context from '../../../../context';
import {
  createTestContext,
  createTestUser,
  destroyTestContext,
  TestUser,
  executeQuery,
} from '../../../../test/utils';
import { baseModules } from '../../../baseModules';
import { Role } from '../../../../auth';
import { expect } from 'chai';
import { promisify } from 'util';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import { fromGlobalId } from '../../../../utils/id';

const TEST_IMAGES = {
  png: path.resolve(__dirname, './assets/testimage.png'),
  jpg: path.resolve(__dirname, './assets/testimage.jpg'),
  svg: path.resolve(__dirname, './assets/testimage.svg'),
  tiff: path.resolve(__dirname, './assets/testimage.tiff'),
  webp: path.resolve(__dirname, './assets/testimage.webp'),
};

const CREATE_IMAGE_MUTATION = `
mutation M($input: createImageInput!) {
  createImage(input: $input) {
    node {
      id
      width
      height
      mimeType
      url
      createdBy {
        id
      }
      size
    }
    uploadUrl
  }
}
`;

describe('createImage mutation', () => {
  let context: Context;
  let user: TestUser;

  before(async () => {
    context = await createTestContext(baseModules);
    user = await createTestUser([Role.AUTHENTICATED], context);
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('requires authentication', async () => {
    try {
      await executeQuery(CREATE_IMAGE_MUTATION, context, {
        input: {
          fileName: 'test-image.png',
          contentLength: 2300,
        },
      });
      throw new Error('Does not throw');
    } catch (e) {
      expect(e.message).to.include(
        'You must be logged in to perform this action'
      );
    }
  });

  it('generates uploadUrl successfully', async () => {
    const file = await promisify(fs.readFile)(TEST_IMAGES.png);
    const result = await executeQuery(
      CREATE_IMAGE_MUTATION,
      context,
      {
        input: {
          fileName: 'test-image.png',
          contentLength: file.length,
        },
      },
      {
        authContext: user.auth,
      }
    );

    const data = result.createImage;
    expect(data.node.mimeType).to.equal('image/png');
    expect(data.node.width).to.equal(null);
    expect(data.node.height).to.equal(null);
    expect(data.node.url).to.include('test-image.png');

    // Send file via PUT request
    const response = await fetch(data.uploadUrl, {
      method: 'PUT',

      headers: {
        'Content-Length': String(file.length),
      },
      body: file,
    });
    expect(response.status).to.equal(200);

    // Retrieve content via file URL
    // @FIXME: We remove hash so original image URL can be queried right form S3 storage
    // We should setup image processing proxy with proper secret management eventually
    const urlParts = data.node.url.split('/');
    urlParts.splice(4, 1);
    // Can load file via url
    const fileResponse = await fetch(urlParts.join('/'));
    expect(fileResponse.status).to.equal(200);
    expect(fileResponse.headers.get('content-length')).to.equal(
      String(file.length)
    );
  });

  it('validates file extension of fileName', async () => {
    const fileExtensions = [
      'segr',
      '28/&%.jpg',
      '.jpg',
      'test.jpegg',
      '',
      'tjpg',
      'some.jpg.jpg',
    ];
    for (let fileName of fileExtensions) {
      try {
        await executeQuery(
          CREATE_IMAGE_MUTATION,
          context,
          {
            input: {
              fileName: fileName,
              contentLength: 2300,
            },
          },
          {
            authContext: user.auth,
          }
        );
        throw new Error('Does not fail for fileName: ' + fileName);
      } catch (e) {
        expect(e.message).to.include(
          'The provided input values could not be validated.'
        );
      }
    }
  });

  it('validates file size', async () => {
    const fileSizes = [-1, 0, 1e9];
    for (let contentLength of fileSizes) {
      try {
        const result = await executeQuery(
          CREATE_IMAGE_MUTATION,
          context,
          {
            input: {
              fileName: 'test-image.png',
              contentLength: contentLength,
            },
          },
          {
            authContext: user.auth,
          }
        );
        throw new Error('Does not fail for contentLength: ' + contentLength);
      } catch (e) {
        expect(e.message).to.include(
          'The provided input values could not be validated.'
        );
      }
    }
  });

  it('set size, createdBy auto values', async () => {
    const file = await promisify(fs.readFile)(TEST_IMAGES.png);
    const result = await executeQuery(
      CREATE_IMAGE_MUTATION,
      context,
      {
        input: {
          fileName: 'test-image.png',
          contentLength: file.length,
        },
      },
      {
        authContext: user.auth,
      }
    );

    const data = result.createImage;
    expect(data.node.size).to.equal(file.length);
    expect(fromGlobalId(data.node.createdBy.id).id).to.equal(
      String(user.user.id)
    );
    expect(data.node.url).to.include('test-image.png');
  });
});
