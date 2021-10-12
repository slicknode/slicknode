/**
 * Created by Ivo Meißner on 23.06.17.
 *
 */

import { MutationConfig } from '../../../definition';

import Context from '../../../context';

import { S3_FILE_PRIVATE_BUCKET, S3_FILE_PUBLIC_BUCKET } from '../../../config';
import { fileClientPrivate, fileClientPublic } from '../../../storage';
import uuid from 'uuid';

import _, { create } from 'lodash';
import File from '../types/File';
import { Role } from '../../../auth';

const createFile: MutationConfig = {
  name: 'createFile',
  inputFields: {
    ..._.pick(File.fields, ['name', 'mimeType', 'isPublic']),
  },
  fields: {
    uploadUrl: {
      typeName: 'String',
      required: true,
      description:
        'A temporary URL where the file data can be sent via a PUT request',
    },
    file: {
      typeName: 'File',
      required: true,
      description: 'The uploaded file',
    },
  },
  permissions: [
    {
      role: Role.AUTHENTICATED,
    },
  ],
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    const { name, mimeType, isPublic } = input;

    // Create file
    const key = [uuid.v4(), input.name].join('/');
    const bucket = isPublic ? S3_FILE_PUBLIC_BUCKET : S3_FILE_PRIVATE_BUCKET;
    const client = isPublic ? fileClientPublic : fileClientPrivate;
    const file = await context.db.File.create({
      name,
      mimeType,
      key,
      bucket,
      isPublic,
    });

    // Generate upload URL
    const uploadUrl = await new Promise((resolve, reject) => {
      const params = {
        Key: [context.getProjectFolderName(), key].join('/'),
        Bucket: bucket,
      };

      client.getSignedUrl('putObject', params, (err, url) => {
        if (url) {
          // If we have google storage endpoint, use
          let signedUrl = url;
          if (signedUrl.split('/')[2].includes('google')) {
            signedUrl = signedUrl.replace('AWSAccessKeyId=', 'GoogleAccessId=');
          }
          resolve(signedUrl);
        } else {
          reject(err);
        }
      });
    });

    return {
      file,
      uploadUrl,
    };
  },
};

export default createFile;
