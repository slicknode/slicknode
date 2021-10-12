/**
 * Created by Ivo Meißner on 24.01.17.
 *
 */

import CoreModule from '../../../../modules/core/index';
import RelayModule from '../../../../modules/relay/index';
import AuthModule from '../../../../modules/auth/index';
import { HANDLER_POSTGRES } from '../..';
import Node from '../../../../modules/relay/types/Node';
import { TypeKind, ModuleKind, ModuleConfig } from '../../../../definition';

import * as uuid from 'uuid';

import { Role } from '../../../../auth';

const modules: ModuleConfig[] = [
  CoreModule,
  RelayModule,
  AuthModule,
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [
      {
        name: 'User',
        kind: TypeKind.OBJECT,
        description: 'User description',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          name: { typeName: 'String' },
        },
        permissions: [{ role: Role.AUTHENTICATED }, { role: Role.ADMIN }],
        interfaces: ['Node'],
      },
      {
        name: 'Membership',
        kind: TypeKind.OBJECT,
        description: 'Group membership',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          user: { typeName: 'User', required: true },
          group: { typeName: 'Group', required: true },
          memberId: { typeName: 'String' },
        },
        interfaces: ['Node'],
      },
      {
        name: 'Group',
        kind: TypeKind.OBJECT,
        description: 'Group description',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          name: { typeName: 'String' },
        },
        permissions: [
          {
            role: Role.AUTHENTICATED,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {users: {node: {id: {eq: $user_id}}}})
          }`,
          },
          { role: Role.ADMIN },
        ],
        interfaces: ['Node'],
      },
      {
        name: 'Article',
        kind: TypeKind.OBJECT,
        description: 'Article description',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          author: { typeName: 'User' },
          authorGroup: { typeName: 'Group' },
          // externalAuthor: {typeName: 'ExternalUser'}
        },
        permissions: [
          {
            role: Role.AUTHENTICATED,
            query: `query ($user_id: ID!) {
            node(filter: {author: {id: {eq: $user_id}}})
          }`,
          },
          {
            role: Role.FULLY_AUTHENTICATED,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {author: {id: {eq: $user_id}}})
          }`,
          },
        ],
        interfaces: ['Node'],
      },
      {
        name: 'GroupEditor',
        kind: TypeKind.OBJECT,
        description: 'Group editors',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          user: { typeName: 'User', required: true, unique: true },
          group: { typeName: 'Group', required: true, unique: true },
        },
        permissions: [
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {user: {id: {eq: $user_id}}})
          }`,
          },
        ],
        interfaces: ['Node'],
      },
      {
        name: 'Comment',
        kind: TypeKind.OBJECT,
        description: 'Comment description',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          article: { typeName: 'Article' },
        },
        permissions: [
          {
            role: Role.AUTHENTICATED,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {article: {author: {id: {eq: $user_id}}}})
          }`,
          },
          {
            role: Role.STAFF,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {article: {author: {groups: {node: {editor: {id: {eq: $user_id}}}}}}})
          }`,
          },
        ],
        interfaces: ['Node'],
      },
      /* ,
      {
        name: 'ExternalUser',
        description: 'user with different handler',
        fields: {
          ...Node.fields
        }
      }*/
    ],
    typeExtensions: {
      Viewer: {
        user: {
          typeName: 'User',
        },
      },
    },
    connections: [
      {
        name: 'users',
        description: 'The members of the group',
        source: {
          typeName: 'Group',
        },
        edge: {
          sourceField: 'group',
          typeName: 'Membership',
          nodeField: 'user',
        },
        node: {
          typeName: 'User',
        },
      },
      {
        name: 'groups',
        description: 'The groups where the user is member',
        source: {
          typeName: 'User',
        },
        edge: {
          sourceField: 'user',
          typeName: 'Membership',
          nodeField: 'group',
        },
        node: {
          typeName: 'Group',
        },
      },
      {
        name: 'users',
        description: 'A list of all users',
        source: {
          typeName: 'Query',
        },
        edge: {
          sourceField: null,
        },
        node: {
          typeName: 'User',
        },
      },
      {
        name: 'groups',
        description: 'A list of all groups',
        source: {
          typeName: 'Query',
        },
        edge: {
          sourceField: null,
        },
        node: {
          typeName: 'Group',
        },
      },
      {
        name: 'memberships',
        description: 'A list of all memberships',
        source: {
          typeName: 'User',
        },
        edge: {
          sourceField: 'user',
        },
        node: {
          typeName: 'Membership',
        },
      },
      {
        name: 'editor',
        description: 'The main editor of the group',
        source: {
          typeName: 'Group',
        },
        edge: {
          typeName: 'GroupEditor',
          sourceField: 'group',
          nodeField: 'user',
        },
        node: {
          typeName: 'User',
        },
      },
    ],
    admin: {
      base: {
        name: '',
        description: '',
        types: {},
        pages: [],
        mutations: {},
      },
    },
  },
];
export default modules;
