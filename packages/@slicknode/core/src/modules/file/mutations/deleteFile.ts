/**
 * Created by Ivo Meißner on 2019-05-07
 *
 */

import { MutationConfig } from '../../../definition';

import Context from '../../../context';

import { S3_FILE_PRIVATE_BUCKET, S3_FILE_PUBLIC_BUCKET } from '../../../config';
import { fileClientPrivate, fileClientPublic } from '../../../storage';

import { fileTokenToId } from '../utils';
import { Role } from '../../../auth';

const deleteFile: MutationConfig = {
  name: 'deleteFile',
  inputFields: {
    token: {
      typeName: 'String',
      required: true,
      description: 'The temporary token of the file to be deleted',
    },
  },
  fields: {
    node: {
      typeName: 'File',
      required: false,
      description: 'The deleted file',
    },
  },
  permissions: [
    {
      role: Role.ADMIN,
    },
    {
      role: Role.RUNTIME,
    },
  ],
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    const { token } = input;

    // Decode token
    const id = fileTokenToId(token, context);

    const file = await context.db.File.find({ id });

    // Create file
    const key = file.key;
    const bucket = file.isPublic
      ? S3_FILE_PUBLIC_BUCKET
      : S3_FILE_PRIVATE_BUCKET;
    const client = file.isPublic ? fileClientPublic : fileClientPrivate;

    // Generate upload URL
    await context.transaction(async (trxContext) => {
      // Delete from cloud storage
      await new Promise<void>((resolve, reject) => {
        const params = {
          Key: [trxContext.getProjectFolderName(), key].join('/'),
          Bucket: bucket,
        };

        client.deleteObject(params, (err) => {
          if (!err) {
            resolve();
          } else {
            reject(err);
          }
        });
      });

      // Delete reference node from DB
      await context.db.File.delete({ id });
    });

    return {
      node: file,
    };
  },
};

export default deleteFile;
