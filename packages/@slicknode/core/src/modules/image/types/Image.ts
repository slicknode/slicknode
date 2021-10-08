/**
 * Created by Ivo Meißner on 01.12.16.
 *
 */

import { FieldAccess, ObjectTypeConfig, TypeKind } from '../../../definition';
import Node from '../../relay/types/Node';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import { HANDLER_POSTGRES } from '../../../schema/handler';

const Image: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'Image',
  description:
    'Information about an image that is stored in persistent storage backend',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  fields: {
    ...Node.fields,
    size: {
      typeName: 'Int',
      required: false,
      description: 'The size of the image in bytes',
    },
    width: {
      typeName: 'Int',
      required: false,
      description: 'The width of the original image',
    },
    height: {
      typeName: 'Int',
      required: false,
      description: 'The height of the original image',
    },
    mimeType: {
      typeName: 'String',
      required: true,
      description: 'The mime type of the image',
      validators: [
        {
          type: 'regex',
          config: {
            pattern: '^image\\/([a-z0-9-]+)((\\.|-|\\+)([a-z0-9]+))?$',
          },
        },
        {
          type: 'length',
          config: {
            max: 128,
          },
        },
      ],
    },
    key: {
      typeName: 'String',
      required: true,
      index: true,
      description: 'The storage key where the image is located',
      access: [],
    },
    bucket: {
      typeName: 'String',
      required: true,
      description: 'The bucket name where the image is stored',
      access: [],
    },
    createdBy: {
      typeName: 'User',
      required: false,
      description: 'The user that created the image',
      access: [FieldAccess.READ],
    },
    uploadedAt: {
      typeName: 'DateTime',
      required: false,
      description: 'The time when the image was uploaded',
    },
    ...TimeStampedInterface.fields,
  },
  interfaces: ['Node', 'TimeStampedInterface'],
};

export default Image;
