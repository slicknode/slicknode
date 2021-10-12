/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import CoreModule from '../../modules/core/index';
import RelayModule from '../../modules/relay/index';
import AuthModule from '../../modules/auth/index';
import { TypeKind, ModuleKind, ModuleConfig } from '../../definition';
import { HANDLER_POSTGRES } from '../../schema/handler';
import Node from '../../modules/relay/types/Node';
import uuid from 'uuid';
import { Role } from '../type';

const moduleConfigs: ModuleConfig[] = [
  CoreModule,
  RelayModule,
  AuthModule,
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [
      {
        name: 'UserType',
        kind: TypeKind.ENUM,
        description: 'User type',
        values: {
          ADMIN: {
            value: 'ADMIN',
          },
          STAFF: {
            value: 'STAFF',
          },
          USER: {
            value: 'USER',
          },
        },
      },
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
          nameOrder: { typeName: 'String' },
          description: { typeName: 'String' },
          email: { typeName: 'String' },
          intField: { typeName: 'Int' },
          intOrderField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          floatOrderField: { typeName: 'Float' },
          isActive: { typeName: 'Boolean', defaultValue: true },
          dateTimeField: { typeName: 'DateTime' },
          dateTimeOrderField: { typeName: 'DateTime' },
          even: { typeName: 'Boolean' },
          userType: { typeName: 'UserType' },
          group: { typeName: 'Group' },
        },
        interfaces: ['Node'],
        permissions: [
          // User can see himself
          {
            role: Role.AUTHENTICATED,
            query: `query PermissionQuery($user_id: ID!) {
            node(filter: {id: $user_id})
          }`,
          },
          // Users can see name and dateTimeField of other users
          { role: Role.AUTHENTICATED, fields: ['name', 'dateTimeField'] },

          // Staff can do everything
          { role: Role.STAFF },
        ],
        mutations: {
          create: [
            // Staff users can create new users
            { role: Role.STAFF },
            { role: Role.ADMIN },

            // Guest can create user with name / email
            { role: Role.ANONYMOUS, fields: ['name', 'email'] },
          ],
          update: [
            // User can update name on himself
            {
              role: Role.AUTHENTICATED,
              fields: ['name'],
              query: `query PermissionQuery($user_id: ID!) {
              node(filter: {id: {eq: $user_id}})
            }`,
            },
            // Staff can update even users
            {
              role: Role.STAFF,
              query: `query {
              node(filter: {even: true})
            }`,
            },
            // Admin can update everything
            { role: Role.ADMIN },
          ],
          delete: [
            // Admin user can delete everyone
            { role: Role.ADMIN },
            // Staff user can delete even users
            {
              role: Role.STAFF,
              query: `query {
              node(filter: {even: true})
            }`,
            },
            // User can delete himself
            {
              role: Role.AUTHENTICATED,
              query: `query PermissionQuery($user_id: ID!) {
              node(filter: {id: {eq: $user_id}})
            }`,
            },
          ],
        },
      },
      {
        name: 'UserProfile',
        kind: TypeKind.OBJECT,
        description: 'User profile description',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          user: { typeName: 'User', unique: true },
          profileText: { typeName: 'String' },
        },
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
        interfaces: ['Node'],
      },
      {
        name: 'ForeignUser',
        kind: TypeKind.OBJECT,
        description: 'Other user profile without connection to user',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          userName: { typeName: 'String', required: true, unique: true },
        },
        interfaces: ['Node'],
      },
      {
        name: 'ForeignUserConnection',
        kind: TypeKind.OBJECT,
        description: 'Connection between user and foreign user',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          user: { typeName: 'User', unique: true },
          foreignUser: { typeName: 'ForeignUser', unique: true },
        },
        interfaces: ['Node'],
      },
    ],
    typeExtensions: {
      Viewer: {
        user: {
          typeName: 'User',
        },
      },
    },
    // We need a dummy mutation, otherwise schema builder does not generate root mutation type
    mutations: [
      {
        name: 'dummyMutation',
        inputFields: {
          fieldName: { typeName: 'String' },
        },
        fields: {
          success: { typeName: 'Boolean' },
        },
        mutate() {
          return {};
        },
        permissions: [],
      },
    ],
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
        name: 'memberships',
        description: 'A list of all memberships',
        source: {
          typeName: 'Group',
        },
        edge: {
          sourceField: 'group',
        },
        node: {
          typeName: 'Membership',
        },
      },
      {
        name: 'profile',
        description: 'A user profile',
        source: {
          typeName: 'User',
        },
        edge: {
          sourceField: 'user',
        },
        node: {
          typeName: 'UserProfile',
        },
      },
      {
        name: 'foreignUser',
        description: 'A foreign user account',
        source: {
          typeName: 'User',
        },
        edge: {
          typeName: 'ForeignUserConnection',
          sourceField: 'user',
          nodeField: 'foreignUser',
        },
        node: {
          typeName: 'ForeignUser',
        },
      },
      {
        name: 'admins',
        description: 'Users that have the group as their main group',
        source: {
          typeName: 'Group',
        },
        edge: {
          sourceField: 'group',
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

export default moduleConfigs;
