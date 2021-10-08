/**
 * Created by Ivo Meißner on 01.12.16.
 *
 */

import { FieldAccess, ObjectTypeConfig, TypeKind } from '../../../definition';
import Node from '../../relay/types/Node';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import Context from '../../../context';
import { idToFileToken } from '../utils';

const File: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'File',
  description:
    'Information about a file that is stored in persistent storage backend',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  fields: {
    ...Node.fields,
    name: {
      typeName: 'String',
      required: true,
      description: 'The name of the file',
      validators: [
        {
          type: 'length',
          config: {
            max: 128,
            min: 1,
          },
        },
        {
          type: 'regex',
          config: {
            pattern: '^([a-zA-Z0-9\\.\\(\\),_-]{1,256})$',
          },
        },
      ],
    },
    mimeType: {
      typeName: 'String',
      required: false,
      description: 'The mime type of the file',
      defaultValue: 'binary/octet-stream',
      validators: [
        {
          type: 'regex',
          config: {
            pattern:
              '^(text|image|audio|video|application|binary|example|message|model|multipart)\\/([a-z0-9-]+)((\\.|-|\\+)([a-z0-9]+))?$',
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
    isPublic: {
      typeName: 'Boolean',
      required: true,
      description: 'If true, the file is publicly accessible',
      defaultValue: false,
    },
    size: {
      typeName: 'Decimal',
      required: false,
      description: 'The size of the file in bytes',
    },
    key: {
      typeName: 'String',
      required: true,
      index: true,
      description: 'The storage key where the file is located',
      access: [],
    },
    bucket: {
      typeName: 'String',
      required: true,
      description: 'The bucket name where the file is stored',
      access: [],
    },
    token: {
      typeName: 'String',
      description:
        'A temporary token that can be passed to mutations to attach a file to nodes. The token can only be used by the current user.',
      required: false,
      resolve(
        file: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) {
        return idToFileToken(file.id, context);
      },
    },
    uploadedAt: {
      typeName: 'DateTime',
      required: false,
      description: 'The date when the file was fully uploaded',
      access: [FieldAccess.READ],
    },
    ...TimeStampedInterface.fields,
  },
  interfaces: ['Node', 'TimeStampedInterface'],
  directAccess: false,
};

export default File;
