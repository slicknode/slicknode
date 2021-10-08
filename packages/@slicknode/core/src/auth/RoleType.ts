/**
 * Created by Ivo Meißner on 01.10.17.
 *
 */

import { GraphQLEnumType } from 'graphql';
import { Role } from './type';

export default new GraphQLEnumType({
  name: 'Role',
  description: 'The role of client accessing the GraphQL server',
  values: {
    ADMIN: {
      description: 'A user with full access to the backend.',
      value: Role.ADMIN,
    },
    STAFF: {
      description: 'A staff user that can login to the backend.',
      value: Role.STAFF,
    },
    AUTHENTICATED: {
      description: 'A user that is authenticated in the system.',
      value: Role.AUTHENTICATED,
    },
    ANONYMOUS: {
      description: 'A guest user, this can be anyone.',
      value: Role.ANONYMOUS,
    },
    RUNTIME: {
      description: 'The runtime environment for custom code.',
      value: Role.RUNTIME,
    },
  },
});
