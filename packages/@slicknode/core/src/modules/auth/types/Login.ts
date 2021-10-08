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
const Login: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'Login',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  description: 'A login by a user',
  fields: {
    ...Node.fields,
    user: {
      typeName: 'User',
      required: true,
      description: 'The user that logged in',
    },
    ip: {
      typeName: 'String',
      required: false,
      description: 'IP address of the logged in client',
    },
    module: {
      typeName: 'String',
      description: 'The module that was used to login',
      required: false,
    },
    userAgent: {
      typeName: 'String',
      required: false,
      description: 'User agent of the logged in client',
    },
    ...TimeStampedInterface.fields,
  },
  permissions: [
    // Staff is allowed everything
    { role: Role.STAFF },
    { role: Role.ADMIN },

    // User can see her own logins
    {
      role: Role.AUTHENTICATED,
      query:
        'query PermissionQuery($user_id: ID!) {node(filter: {user: {id: {eq: $user_id}}})}',
    },
  ],
  interfaces: ['Node', 'TimeStampedInterface'],
};

export default Login;
