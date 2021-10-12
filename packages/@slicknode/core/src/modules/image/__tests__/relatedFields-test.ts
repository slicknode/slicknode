/**
 * Created by Ivo Meißner on 07.08.18
 *
 */
import typeExtensions from '../typeExtensions';
import { createContextMock } from '../../../test/utils';
import { tenantModules } from '../../index';
import { expect } from 'chai';
import { S3_IMAGE_ENDPOINT_CDN } from '../../../config';
import * as ImageResizeMethod from '../types/ImageResizeMethod';

describe('Image typeExtensions test', () => {
  describe('Image.url', () => {
    it('returns a original image URL for no dimensions', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {};
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}93ef1646e6dbc26d3055529c07d1f812181780cf/_root/test/image`
      );
    });

    it('returns a URL for width only', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        width: 100,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}0e11c965db86140ca504da25c3d377693b8011f0/100x/_root/test/image`
      );
    });

    it('returns a URL for height only', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        height: 100,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}e0fe503fec1f9cafa2022fc30ea1d8f9add0ee82/x100/_root/test/image`
      );
    });

    it('allows negative height', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        height: -100,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}51de8f9a888ed3d538da4b9e4cc387890b21f45d/x-100/_root/test/image`
      );
    });

    it('allows negative width', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        width: -100,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}1b42ceec419bed1f91e428f5bf5de3a1ac64c90e/-100x/_root/test/image`
      );
    });

    it('returns a URL with smart cropping', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        width: 100,
        height: 110,
        resizeMethod: ImageResizeMethod.SMART,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}53fe2c9dac13fbf519042b6352d6e1b0a3666f1d/100x110/smart/_root/test/image`
      );
    });

    it('returns a URL with fit resize method', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        width: 100,
        height: 110,
        resizeMethod: ImageResizeMethod.FIT,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}feba167a4687948af454bfc0120fbee6e28cd324/full-fit-in/100x110/_root/test/image`
      );
    });

    it('returns a URL with crop resize method', () => {
      const context = createContextMock(tenantModules);
      const source = {
        key: 'test/image',
      };
      const args = {
        width: 100,
        height: 110,
        resizeMethod: ImageResizeMethod.CROP,
      };
      expect(typeExtensions.Image.url.resolve(source, args, context)).to.equal(
        `${S3_IMAGE_ENDPOINT_CDN}a6b882a9cd6418408390063e00341eaa97bdf52e/100x110/_root/test/image`
      );
    });
  });
});
