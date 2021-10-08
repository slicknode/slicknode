/**
 * Created by Ivo Meißner on 16.12.17.
 *
 */

import { ObjectTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import Node from '../../relay/types/Node';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import { Role } from '../../../auth';

/* eslint-disable max-len */
const AccessToken: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'AccessToken',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  description: 'A permanent access token',
  expose: false,
  fields: {
    ...Node.fields,
    user: {
      typeName: 'User',
      required: true,
      index: true,
      description: 'The owner of the token',
    },
    expires: {
      typeName: 'DateTime',
      required: true,
      description: 'The time when the token expires',
    },
    readOnly: {
      typeName: 'Boolean',
      required: true,
      description: 'Only allow read operations',
    },
    ip: {
      typeName: 'String',
      required: true,
      description: 'The IP address of the client that requested the token',
    },
    secret: {
      typeName: 'String',
      required: true,
      description: 'The secret that belongs to the token',
      access: [],
    },
    ...TimeStampedInterface.fields,
  },
  permissions: [
    // Admin user can see access tokens
    { role: Role.AUTHENTICATED },
  ],
  interfaces: ['Node', 'TimeStampedInterface'],
};

export default AccessToken;
