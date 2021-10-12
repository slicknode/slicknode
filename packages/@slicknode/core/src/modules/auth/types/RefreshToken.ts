/**
 * Created by Ivo Meißner on 05.05.17.
 *
 */

import { ObjectTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import Node from '../../relay/types/Node';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import { Role } from '../../../auth';

/* eslint-disable max-len */
const RefreshToken: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'RefreshToken',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  description: 'A refresh token to obtain a new access token',
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
    userAgent: {
      typeName: 'String',
      required: false,
      description: 'The user agent the created the refresh token',
    },
    ip: {
      typeName: 'String',
      required: true,
      description: 'The IP address of the client that requested the token',
    },
    ...TimeStampedInterface.fields,
  },
  interfaces: ['Node', 'TimeStampedInterface'],
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
  mutations: {
    delete: [
      // User can delete their own refresh tokens
      {
        role: Role.AUTHENTICATED,
        query:
          'query PermissionQuery($user_id: ID!) {node(filter: {user: {id: {eq: $user_id}}})}',
      },
      // Admin can delete all refresh tokens
      { role: Role.ADMIN },
    ],
  },
};

export default RefreshToken;
