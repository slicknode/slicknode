/**
 * Created by Ivo Meißner on 23.06.17.
 *
 */

import Context from '../../context';
import { fileClientPrivate } from '../../storage';
import {
  S3_FILE_PRIVATE_BUCKET,
  S3_FILE_PUBLIC_ENDPOINT_CDN,
} from '../../config';
import { fileTokenToId } from './utils';

export default {
  Query: {
    getFileByToken: {
      typeName: 'File',
      description: 'Returns a File object by its temporary token',
      required: false,
      arguments: {
        token: {
          typeName: 'String',
          required: true,
          description: 'The token of the File object to be returned',
        },
      },
      resolve: (
        obj: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) => {
        const id = fileTokenToId(args.token, context);

        return id ? context.getLoader('File').load(id) : null;
      },
    },
  },
  File: {
    url: {
      typeName: 'String',
      description: 'A temporary public URL to the file',
      required: true,
      async resolve(
        source: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) {
        // Get user from current context
        const key = [context.getProjectFolderName(), source.key].join('/');

        // Check if we serve via CDN or signed URL
        if (source.isPublic) {
          return S3_FILE_PUBLIC_ENDPOINT_CDN + key;
        }

        return await new Promise((resolve, reject) => {
          const params = {
            Key: key,
            Bucket: S3_FILE_PRIVATE_BUCKET,
            Expires: 60 * 30, // 30 minutes
          };

          // Limit surrogate cache maxAge
          if (context.surrogateCache) {
            context.surrogateCache.setMaxAge(60 * 15);
          }

          return fileClientPrivate.getSignedUrl(
            'getObject',
            params,
            (err, url) => {
              if (err) {
                reject(err);
              } else {
                let signedUrl = url;
                // If we have google storage endpoint, use
                if (signedUrl.split('/')[2].includes('google')) {
                  signedUrl = signedUrl.replace(
                    'AWSAccessKeyId=',
                    'GoogleAccessId='
                  );
                }
                resolve(signedUrl);
              }
            }
          );
        });
      },
    },
  },
};
