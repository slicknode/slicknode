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
} from '../../../../test/utils';

import { baseModules } from '../../..';
import path from 'path';

import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import Context from '../../../../context';
import fetch from 'node-fetch';
import { ErrorCode } from '../../../../errors';
import { Role } from '../../../../auth';

chai.use(chaiAsPromised);

const query = `mutation UploadImageMutation($input: uploadImageInput!) {
  uploadImage(input: $input) {
    node {
      id
      width
      height
      size
      mimeType
      url
    }
  }
}`;

describe('uploadImage mutation', () => {
  let context: Context;
  let app: Function;
  let user: {
    [x: string]: any;
  };

  before((done) => {
    executeWithModule(baseModules, (testModule, testContext) => {
      app = testModule;
      context = testContext;

      createTestUser([Role.AUTHENTICATED], testContext)
        .then((testUser) => {
          user = testUser.user;

          done();
        })
        .catch(done);
    });
  });

  after(async () => {
    await destroyTestContext(context);
  });

  it('uploads image successfully', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
          files: {
            file: path.resolve(__dirname, './assets/testimage.png'),
          },
        },
        user
      );

      expect(result.data.uploadImage).not.to.be.null;
      expect(result.data.uploadImage.node).not.to.be.null;
      const node = result.data.uploadImage.node;

      expect(node.height).to.equal(268);
      expect(node.width).to.equal(428);
      expect(node.mimeType).to.equal('image/png');
      expect(node.size).to.equal(241422);

      // Fetch image via URL
      // Retrieve content via file URL
      // @FIXME: We remove hash so original image URL can be queried right form S3 storage
      // We should setup image processing proxy with proper secret management eventually
      const urlParts = node.url.split('/');
      urlParts.splice(4, 1);

      const savedImage = await fetch(urlParts.join('/'));
      expect(savedImage.status).to.equal(200);
      const content = await savedImage.text();
      expect(content.length).to.be.above(100000);

      // Check headers
      expect(savedImage.headers.get('cache-control')).to.equal(
        'public, max-age=2592000'
      );
      expect(savedImage.headers.get('content-type')).to.equal('image/png');
    }

    runTest().then(done).catch(done);
  });

  const testFiles = [
    {
      image: 'testimage.svg',
      mimeType: 'image/svg+xml',
      width: 380,
      height: 395,
      size: 6254,
      contentLength: 6254,
    },
    {
      image: 'testimage.gif',
      mimeType: 'image/gif',
      width: 480,
      height: 270,
      size: 1468176,
      contentLength: 1407857,
    },
    {
      image: 'testimage.jpg',
      mimeType: 'image/jpeg',
      width: 428,
      height: 268,
      size: 241422,
      contentLength: 228692,
    },
    {
      image: 'testimage.png',
      mimeType: 'image/png',
      width: 428,
      height: 268,
      size: 241422,
      contentLength: 228692,
    },
    // {
    //   image: 'testimage.bmp',
    //   mimeType: 'image/bmp',
    //   width: 428,
    //   height: 268,
    //   size: 458954,
    //   contentLength: 458951,
    // },
    {
      image: 'testimage.webp',
      mimeType: 'image/webp',
      width: 428,
      height: 268,
      size: 15592,
      contentLength: 14797,
    },
  ];
  for (let testFile of testFiles) {
    it(`uploads ${testFile.mimeType} image successfully`, async () => {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
          files: {
            file: path.resolve(__dirname, './assets/' + testFile.image),
          },
        },
        user
      );

      expect(result.data.uploadImage).not.to.be.null;
      expect(result.data.uploadImage.node).not.to.be.null;
      const node = result.data.uploadImage.node;

      expect(node.height).to.equal(testFile.height);
      expect(node.width).to.equal(testFile.width);
      expect(node.mimeType).to.equal(testFile.mimeType);
      expect(node.size).to.equal(testFile.size);

      // Fetch image via URL
      // Retrieve content via file URL
      // @FIXME: We remove hash so original image URL can be queried right form S3 storage
      // We should setup image processing proxy with proper secret management eventually
      const urlParts = node.url.split('/');
      urlParts.splice(4, 1);

      const savedImage = await fetch(urlParts.join('/'));
      expect(savedImage.status).to.equal(200);
      const content = await savedImage.text();
      expect(content.length).to.be.equal(testFile.contentLength);

      // Check headers
      expect(savedImage.headers.get('cache-control')).to.equal(
        'public, max-age=2592000'
      );
      expect(savedImage.headers.get('content-type')).to.equal(
        testFile.mimeType
      );
    });
  }

  it('uploads png image successfully', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
          files: {
            file: path.resolve(__dirname, './assets/testimage.png'),
          },
        },
        user
      );

      expect(result.data.uploadImage).not.to.be.null;
      expect(result.data.uploadImage.node).not.to.be.null;
      const node = result.data.uploadImage.node;

      expect(node.height).to.equal(268);
      expect(node.width).to.equal(428);
      expect(node.mimeType).to.equal('image/png');
      expect(node.size).to.equal(241422);

      // Fetch image via URL
      // Retrieve content via file URL
      // @FIXME: We remove hash so original image URL can be queried right form S3 storage
      // We should setup image processing proxy with proper secret management eventually
      const urlParts = node.url.split('/');
      urlParts.splice(4, 1);

      const savedImage = await fetch(urlParts.join('/'));
      expect(savedImage.status).to.equal(200);
      const content = await savedImage.text();
      expect(content.length).to.be.above(100000);

      // Check headers
      expect(savedImage.headers.get('cache-control')).to.equal(
        'public, max-age=2592000'
      );
      expect(savedImage.headers.get('content-type')).to.equal('image/png');
    }

    runTest().then(done).catch(done);
  });

  it('does not allow upload for anonymous user', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(app, {
        query,
        variables: {
          input: {},
        },
      });

      expect(result.data.uploadImage).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.LOGIN_REQUIRED
      );
    }

    runTest().then(done).catch(done);
  });

  it('fails if no file is provided', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
        },
        user
      );

      expect(result.data.uploadImage).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.INPUT_VALIDATION_FAILED
      );
    }

    runTest().then(done).catch(done);
  });

  it('checks if file has the right file type', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
          files: {
            file: path.resolve(__dirname, './assets/corruptimage.txt'),
          },
        },
        user
      );

      expect(result.data.uploadImage).to.be.null;
      expect(result.errors.length).to.equal(1);
      expect(result.errors[0].extensions.code).to.equal(
        ErrorCode.INPUT_VALIDATION_FAILED
      );
    }

    runTest().then(done).catch(done);
  });

  it('can reload Image node', (done) => {
    async function runTest() {
      const result = await executeQueryRequest(
        app,
        {
          query,
          variables: {
            input: {},
          },
          files: {
            file: path.resolve(__dirname, './assets/testimage.png'),
          },
        },
        user
      );

      expect(result.data.uploadImage).not.to.be.null;
      expect(result.data.uploadImage.node).not.to.be.null;
      const node = result.data.uploadImage.node;

      expect(node.height).to.equal(268);
      expect(node.width).to.equal(428);
      expect(node.mimeType).to.equal('image/png');
      expect(node.size).to.equal(241422);

      // Fetch image node via ID
      const nodeResult = await executeQueryRequest(
        app,
        {
          query: `query NodeQuery($id: ID!) {
          node(id: $id){
            id
            ...on Image {
              width
              height
              size
              mimeType
              url
            }
          }
        }`,
          variables: {
            id: node.id,
          },
        },
        user
      );
      expect(nodeResult.data.node).to.deep.equal(node);
    }

    runTest().then(done).catch(done);
  });

  after((done) => {
    destroyTestContext(context).then(done).catch(done);
  });
});
