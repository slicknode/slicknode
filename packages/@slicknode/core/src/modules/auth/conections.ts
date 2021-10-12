import { ConnectionConfig } from '../../definition';

/**
 * Created by Ivo Meißner on 23.01.17.
 *
 */

const connections: ConnectionConfig[] = [
  {
    name: 'logins',
    description: 'The logins of the user',
    source: {
      typeName: 'User',
    },
    edge: {
      sourceField: 'user',
    },
    node: {
      typeName: 'Login',
    },
  },
  {
    name: 'refreshTokens',
    description: 'The refresh tokens (active devices) of a user',
    source: {
      typeName: 'User',
    },
    edge: {
      sourceField: 'user',
    },
    node: {
      typeName: 'RefreshToken',
    },
  },
];
export default connections;
