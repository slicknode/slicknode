/**
 * Created by Ivo Meißner on 13.12.16.
 *
 */

import { ObjectTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import Node from '../../relay/types/Node';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import { Role } from '../../../auth';

/* eslint-disable max-len */
const PasswordResetToken: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'PasswordResetToken',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  description: 'A user of the project',
  fields: {
    ...Node.fields,
    expires: {
      typeName: 'DateTime',
      required: true,
      description: 'The time when the reset token expires',
    },
    secret: {
      typeName: 'String',
      required: true,
      description: 'The token to reset the password',
    },
    user: {
      typeName: 'User',
      required: true,
      description: 'The user that the reset token is valid for',
    },
    ...TimeStampedInterface.fields,
  },
  permissions: [
    // Admin user can reset the password
    { role: Role.ADMIN },
  ],
  expose: false,
  interfaces: ['Node', 'TimeStampedInterface'],
};

export default PasswordResetToken;
