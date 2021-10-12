/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import CoreModule from '../../../../modules/core/index';
import RelayModule from '../../../../modules/relay/index';
import { TypeKind, ModuleKind, ModuleConfig } from '../../../../definition';
import { HANDLER_POSTGRES } from '../..';
import Node from '../../../../modules/relay/types/Node';
import uuid from 'uuid';

const modules: ModuleConfig[] = [
  CoreModule,
  RelayModule,
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
          intField: { typeName: 'Int' },
          intOrderField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          floatOrderField: { typeName: 'Float' },
          dateTimeField: { typeName: 'DateTime' },
          dateTimeOrderField: { typeName: 'DateTime' },
          even: { typeName: 'Boolean' },
          userType: { typeName: 'UserType' },
          group: { typeName: 'Group' },
        },
        interfaces: ['Node'],
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
    connections: [
      {
        name: 'users',
        label: 'Users',
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
        label: 'Groups',
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
        label: 'Users',
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
        label: 'Groups',
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
        label: 'Memberships',
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
        label: 'Memberships',
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
        label: 'Profile',
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
        label: 'Foreign user account',
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
      {
        name: 'sameNameOrderUsers',
        description: 'Users that have the same name order',
        source: {
          typeName: 'User',
          keyField: 'nameOrder',
        },
        edge: {
          sourceField: 'nameOrder',
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
