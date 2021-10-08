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
import path from 'path';
import { updateImageMetaData } from '../updateImageMetaData';

const TEST_IMAGES = {
  png: path.resolve(__dirname, './assets/testimage.png'),
  jpg: path.resolve(__dirname, './assets/testimage.jpg'),
  svg: path.resolve(__dirname, './assets/testimage.svg'),
  // tiff: path.resolve(__dirname, './assets/testimage.tiff'),
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
    }
    uploadUrl
  }
}
`;

describe('updateImageMetaData service', () => {
  let context: Context;
  let user: TestUser;

  before(async () => {
    context = await createTestContext(baseModules);
    user = await createTestUser([Role.AUTHENTICATED], context);
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('updates image metadata successfully', async () => {
    for (const img of Object.keys(TEST_IMAGES)) {
      const file = await promisify(fs.readFile)(TEST_IMAGES[img]);
      const result = await executeQuery(
        CREATE_IMAGE_MUTATION,
        context,
        {
          input: {
            fileName: 'test-image.png',
            contentLength: 234,
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

      // Get key from image
      const image = await context.db.Image.find({
        id: context.fromGlobalId(data.node.id).id,
      });

      // Update image metadata
      const updatedImage = await updateImageMetaData({
        key: image.key,
        context,
      });
      expect(updatedImage.width).to.be.above(10);
      expect(updatedImage.width).to.be.below(100000);
      expect(updatedImage.height).to.above(10);
      expect(updatedImage.height).to.below(1000000);
      expect(updatedImage.size).to.be.above(1000);
      expect(updatedImage.size).to.be.below(10000000);
    }
  });

  it('fails for invalid image file', async () => {
    const result = await executeQuery(
      CREATE_IMAGE_MUTATION,
      context,
      {
        input: {
          fileName: 'test-image.png',
          contentLength: 234,
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
    const filePath = path.resolve(__dirname, 'assets', 'corruptimage.txt');
    const file = await promisify(fs.readFile)(filePath);
    const response = await fetch(data.uploadUrl, {
      method: 'PUT',

      headers: {
        'Content-Length': filePath,
      },
      body: file,
    });
    expect(response.status).to.equal(200);

    // Get key from image
    const image = await context.db.Image.find({
      id: context.fromGlobalId(data.node.id).id,
    });

    // Update image metadata
    try {
      await updateImageMetaData({
        key: image.key,
        context,
      });
      throw new Error('Does not throw');
    } catch (e) {
      expect(e.message).to.include('unsupported file type');
    }
  });
});
