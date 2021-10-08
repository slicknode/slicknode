/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import Context from '../../context';
import { Role } from '../../auth/type';

export default {
  Viewer: {
    user: {
      name: 'user',
      typeName: 'User',
      description: 'The currently logged in user',
      required: false,
      resolve: (
        source: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) => {
        // Get user from current context
        if (context.auth && context.auth.uid) {
          return context.getLoader('User').load(context.auth.uid);
        }

        return null;
      },
    },
    roles: {
      typeName: 'Role',
      list: true,
      require: true,
      description: 'Auth roles of the current user',
      resolve(
        source: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ): Array<Role> {
        if (context.auth && context.auth.roles) {
          return context.auth.roles;
        }
        return [];
      },
    },
  },
};
