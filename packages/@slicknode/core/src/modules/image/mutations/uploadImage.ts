/**
 * Created by Ivo Meißner on 23.06.17.
 *
 */

import uuid from 'uuid';

import { MutationConfig } from '../../../definition';
import Context from '../../../context';
import { S3_IMAGE_BUCKET } from '../../../config';
import { imageClient } from '../../../storage';
import { ValidationError } from '../../../errors';
import { imageSize } from 'image-size';
import { getSurrogateKeys } from '../../../cache/surrogate/utils';
import { VALID_MIME_TYPES, VALID_FILE_EXTENSIONS } from '../constants';
import { Role } from '../../../auth';

const uploadImage: MutationConfig = {
  name: 'uploadImage',
  deprecationReason:
    'uploadImage mutation will be removed in a future version in favor of createImage mutation',
  inputFields: {
    fieldName: {
      typeName: 'String',
      required: false,
      description:
        'The HTTP multipart field name that contains the image file to be uploaded. Default value is `file`',
      validators: [
        {
          type: 'regex',
          config: {
            pattern: '^([a-zA-Z0-9]{1,128})$',
          },
        },
      ],
      defaultValue: 'file',
    },
  },
  fields: {
    node: {
      typeName: 'Image',
      required: true,
      description: 'The uploaded image',
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
    // Check if we have a file
    const files = context.req.files as Array<any>; // @TODO: Discriminate types from multer
    if (
      !files ||
      !files.length ||
      !files.some((file) => file.fieldname === input.fieldName)
    ) {
      throw new ValidationError(
        context.req.__(
          'mutations.uploadImage.invalidFile.message:There was no file provided in the request'
        )
      );
    }
    const uploadedFile = files.find(
      (file) => file.fieldname === input.fieldName
    );
    const nameParts = uploadedFile.originalname.split('.');
    const extension = nameParts[nameParts.length - 1].toLowerCase();
    if (
      !VALID_MIME_TYPES.includes(uploadedFile.mimetype) ||
      !VALID_FILE_EXTENSIONS.includes(extension)
    ) {
      throw new ValidationError(
        context.req.__(
          'mutations.uploadImage.invalidFileType.message:The file has an invalid format. Please only upload images.'
        )
      );
    }

    // Assemble key for file
    const key = [uuid.v4() + '.' + extension].join('/');

    // Load image dimensions, check if is valid image file etc.
    const { width, height } = imageSize(uploadedFile.buffer);
    if (!width || !height) {
      throw new ValidationError(
        context.req.__(
          'mutations.uploadImage.imageSize.message:The file has an invalid format. Please only upload images.'
        )
      );
    }

    // Upload image
    const params = {
      Bucket: S3_IMAGE_BUCKET,
      Key: [context.getProjectFolderName(), key].join('/'),
      Body: uploadedFile.buffer,
      CacheControl: 'public, max-age=' + 60 * 60 * 24 * 30, // 30 days,
      ContentType: uploadedFile.mimetype,
    };
    const uploadedAt = await new Promise((resolve, reject) => {
      imageClient.putObject(params, (err) => {
        if (err) {
          console.error(`Error uploading image: ${err.message}`);
          return reject(new Error('Error uploading image to data storage'));
        }

        resolve(new Date());
      });
    });

    // Create image object
    const node = await context.db.Image.create({
      key,
      bucket: S3_IMAGE_BUCKET,
      mimeType: uploadedFile.mimetype,
      width,
      height,
      size: uploadedFile.size,
      uploadedAt,
    });

    // Invalidate node
    if (context.surrogateCache) {
      const { key, fallbackKey } = getSurrogateKeys({
        typeConfig: context.schemaBuilder.getObjectTypeConfig('Image'),
        preview: true, // Create is always in preview and non content-nodes don't distinguish between the two
        node,
      });
      await context.surrogateCache.purge([key, fallbackKey]);
    }

    return {
      node,
    };
  },
};

export default uploadImage;
