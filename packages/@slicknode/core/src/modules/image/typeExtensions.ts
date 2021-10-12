/**
 * Created by Ivo Meißner on 23.06.17.
 *
 */

import Context from '../../context';
import { S3_IMAGE_ENDPOINT_CDN, IMAGE_THUMBNAIL_SECRET } from '../../config';
import * as ImageResizeMethod from './types/ImageResizeMethod';
import crypto from 'crypto';

export default {
  Image: {
    url: {
      typeName: 'String',
      description: 'A public URL to the image',
      required: true,
      arguments: {
        width: {
          typeName: 'Int',
          required: false,
          description: 'The width of the image under the returned URL',
        },
        height: {
          typeName: 'Int',
          required: false,
          description: 'The height of the image under the returned URL',
        },
        resizeMethod: {
          typeName: 'ImageResizeMethod',
          required: false,
          description: 'The resize method to fit the image in the dimensions',
        },
      },
      resolve: (
        source: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) => {
        // Build image filter / resize options
        const filters = [];

        if (args.resizeMethod === ImageResizeMethod.FIT) {
          filters.push('full-fit-in');
        }

        if (args.width || args.height) {
          filters.push(`${args.width || ''}x${args.height || ''}`);
        }

        if (args.resizeMethod === ImageResizeMethod.SMART) {
          filters.push('smart');
        }

        // Get key of file
        const key = [
          ...filters,
          context.getProjectFolderName(),
          source.key,
        ].join('/');

        // Generate hash
        const hash =
          crypto
            .createHmac('sha1', IMAGE_THUMBNAIL_SECRET)
            .update(key)
            .digest('hex') + '/';

        const separator = !S3_IMAGE_ENDPOINT_CDN.endsWith('/') ? '/' : '';

        return S3_IMAGE_ENDPOINT_CDN + separator + hash + key;
      },
    },
  },
  User: {
    image: {
      typeName: 'Image',
      required: false,
      description: 'A profile image of the user',
    },
  },
};
