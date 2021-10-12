import { MutationConfig } from '../../../definition';
import { Role } from '../../../auth';
import { EXTENSION_MIME_TYPES, VALID_FILE_EXTENSIONS } from '../constants';
import * as uuid from 'uuid';
import { S3_IMAGE_BUCKET } from '../../../config';
import { imageClient } from '../../../storage';

export const createImageMutation: MutationConfig = {
  description:
    'Creates an image object and returns an upload URL where the image file can be uploaded to',
  name: 'createImage',
  permissions: [{ role: Role.AUTHENTICATED }],
  inputFields: {
    fileName: {
      typeName: 'String',
      required: true,
      description: 'The filename of the image',
      validators: [
        {
          type: 'regex',
          config: {
            pattern: new RegExp(
              `(${VALID_FILE_EXTENSIONS.map((ext) => `\\.${ext}`).join('|')})$`,
              'i'
            ),
          },
          message: 'File type is not supported',
        },
        {
          type: 'regex',
          config: {
            pattern: '^([0-9a-zA-Z_-]+)\\.([a-zA-Z0-9]+)$',
          },
          message: 'The filename contains invalid characters',
        },
      ],
    },
    contentLength: {
      typeName: 'Int',
      required: true,
      description:
        'The size of the image file in bytes. This will be used as the Content-Length header',
      validators: [
        {
          type: 'compareNumber',
          config: { lte: 10_485_760 }, // 10 MB
          message: 'The image file cannot be larger than 10 MB',
        },
        {
          type: 'compareNumber',
          config: { gt: 0 },
          message: 'Invalid contentLength value',
        },
      ],
    },
  },
  fields: {
    node: {
      typeName: 'Image',
      required: true,
      description:
        'The image object. Note that the actual image is only available after the file is successfully uploaded to the `uploadUrl`',
    },
    uploadUrl: {
      typeName: 'String',
      required: true,
      description:
        'A temporary URL to which the image file can be uploaded to via HTTP PUT request. Expires after 10 minutes.',
    },
  },
  async mutate(args, context) {
    const { fileName, contentLength } = args;

    const fileNameParts = fileName.split('.');
    const extension = fileNameParts.pop().toLowerCase();

    // Assemble key for file
    const key = [uuid.v4(), `${fileNameParts.join('.')}.${extension}`].join(
      '/'
    );

    // Create image object
    const mimeType = EXTENSION_MIME_TYPES[extension];
    const node = await context.db.Image.create({
      key,
      bucket: S3_IMAGE_BUCKET,
      mimeType,
    });

    // Generate upload URL
    const params = {
      Key: [context.getProjectFolderName(), key].join('/'),
      Bucket: S3_IMAGE_BUCKET,
      ContentType: mimeType,
      // ContentLength: contentLength,
      // CacheControl: 'public, max-age=31557600, immutable',
      // Tagging: `Project=${context.project?.alias || '_root'}`,
    };
    let uploadUrl = await imageClient.getSignedUrlPromise('putObject', params);
    // If we have google storage endpoint, use GoogleAccessId
    if (uploadUrl.split('/')[2].includes('google')) {
      uploadUrl = uploadUrl.replace('AWSAccessKeyId=', 'GoogleAccessId=');
    }

    return {
      node,
      uploadUrl,
    };
  },
};
