/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */

import CoreModule from '../../../modules/core';
import RelayModule from '../../../modules/relay';
import AuthModule from '../../../modules/auth';
import ImageModule from '../../../modules/image';
import * as uuid from 'uuid';

import DateTime from '../../../modules/core/types/DateTime';

import {
  ModuleKind,
  InputElementType,
  ModuleConfig,
  TypeKind,
} from '../../../definition';
import { DirectiveLocation, GraphQLObjectType } from 'graphql';
import { Role } from '../../../auth';

const CORE_APPS = [CoreModule, RelayModule, AuthModule, ImageModule];

export const objectTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          stringField: {
            typeName: 'String',
            description: 'Field description',
            validators: [
              {
                type: 'regex',
                config: {
                  pattern: '/^(a-z)$/i',
                },
              },
            ],
          },
          requiredStringField: {
            typeName: 'String',
            required: true,
          },
          intField: { typeName: 'Int', index: true },
          floatField: {
            typeName: 'Float',
            description: 'Some multiline \ncomment with special """ characters',
          },
          booleanField: {
            typeName: 'Boolean',
            description:
              'Super long comment in one line that will be broken into multiple lines of 80 characters. We need some more text here so that it actually creates a break.',
          },
          idField: { typeName: 'ID' },
          listField: {
            typeName: 'String',
            list: true,
            arguments: {
              query: {
                typeName: 'String',
                defaultValue: 'query',
              },
            },
          },
          requiredListField: {
            typeName: 'String',
            required: true,
            unique: true,
            list: true,
          },
        },
        autoCompleteFields: ['stringField'],
        indexes: [
          { fields: ['stringField', 'idField'], unique: true },
          { fields: ['stringField'] },
        ],
        permissions: [
          {
            role: Role.ADMIN,
            query: `query {
          node(filter: {booleanField: true})
        }`,
          },
        ],
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
  ...CORE_APPS,
];

export const connectionModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'Group',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          externalId: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'SuperAdmin',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          group: {
            typeName: 'Group',
            required: true,
            unique: true,
          },
          member: {
            typeName: 'Member',
            required: true,
            unique: true,
          },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'Membership',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          group: {
            typeName: 'Group',
            required: true,
          },
          member: {
            typeName: 'Member',
            required: true,
          },
          externalMemberId: {
            typeName: 'String',
            required: true,
          },
          externalGroupId: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'Member',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          externalId: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
    ],
    connections: [
      {
        name: 'members',
        description: 'Group members',
        source: {
          typeName: 'Group',
        },
        edge: {
          typeName: 'Membership',
          nodeField: 'member',
          sourceField: 'group',
        },
        node: {
          typeName: 'Member',
        },
      },
      {
        name: 'superAdmin',
        description: 'Super admin',
        source: {
          typeName: 'Group',
        },
        edge: {
          typeName: 'SuperAdmin',
          nodeField: 'member',
          sourceField: 'group',
        },
        node: {
          typeName: 'Member',
        },
      },
      {
        name: 'memberships',
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
        name: 'membershipCustomKey',
        source: {
          typeName: 'Group',
          keyField: 'externalId',
        },
        edge: {
          sourceField: 'externalGroupId',
          typeName: 'Membership',
          nodeField: 'externalMemberId',
        },
        node: {
          keyField: 'externalId',
          typeName: 'Member',
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
  ...CORE_APPS,
];

export const extendedTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'Group',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          externalId: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'Membership',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          group: {
            typeName: 'Group',
            required: true,
          },
          member: {
            typeName: 'User',
            required: true,
          },
          externalMemberId: {
            typeName: 'String',
            required: true,
          },
          externalGroupId: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
    ],
    typeExtensions: {
      Query: {
        testField: {
          description: 'Test description',
          typeName: 'String',
        },
        testField2: {
          description: 'Test description',
          typeName: 'String',
        },
      },
      User: {
        email: {
          typeName: 'String',
          required: true,
        },
      },
    },
    connections: [
      {
        name: 'groups',
        description: 'Groups',
        source: {
          typeName: 'User',
        },
        edge: {
          typeName: 'Membership',
          nodeField: 'group',
          sourceField: 'member',
        },
        node: {
          typeName: 'Group',
        },
      },
      {
        name: 'membershipCustomKey',
        source: {
          typeName: 'User',
          keyField: 'externalId',
        },
        edge: {
          sourceField: 'externalMemberId',
          typeName: 'Membership',
          nodeField: 'externalGroupId',
        },
        node: {
          keyField: 'externalId',
          typeName: 'Group',
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
  ...CORE_APPS,
];

export const enumTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.ENUM,
        name: 'TestType',
        description: 'TestDescription',
        values: {
          TEST: {
            value: 'TEST',
            description: 'Test value',
          },
          SECOND: {
            value: 'SECOND',
            description: 'Second description',
            deprecationReason: 'Deprecated value',
          },
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
  ...CORE_APPS,
];

export const inputObjectTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.INPUT_OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          stringField: { typeName: 'String', description: 'Field description' },
          requiredStringField: {
            typeName: 'String',
            required: true,
          },
          intField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          booleanField: { typeName: 'Boolean' },
          idField: { typeName: 'ID' },
          listField: {
            typeName: 'String',
            list: true,
            arguments: {
              query: {
                typeName: 'String',
                defaultValue: 'query',
              },
            },
          },
          requiredListField: {
            typeName: 'String',
            required: true,
            unique: true,
            list: true,
            defaultValue: ['test'],
          },
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
  ...CORE_APPS,
];

export const interfaceTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.INTERFACE,
        name: 'TestType',
        description: 'TestDescription',
        resolveType(): string {
          return '';
        },
        fields: {
          stringField: { typeName: 'String', description: 'Field description' },
          requiredStringField: {
            typeName: 'String',
            required: true,
          },
          intField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          booleanField: { typeName: 'Boolean' },
          idField: { typeName: 'ID' },
          listField: {
            typeName: 'String',
            list: true,
            arguments: {
              query: {
                typeName: 'String',
                defaultValue: 'query',
              },
            },
          },
          requiredListField: {
            typeName: 'String',
            required: true,
            unique: true,
            list: true,
            defaultValue: ['test'],
          },
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
  ...CORE_APPS,
];

export const scalarTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [DateTime],
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
  ...CORE_APPS,
];

export const unionTypeModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'Object1',
        fields: {
          stringField: { typeName: 'String' },
        },
      },
      {
        kind: TypeKind.OBJECT,
        name: 'Object2',
        fields: {
          stringField: { typeName: 'String' },
        },
      },
      {
        kind: TypeKind.UNION,
        name: 'TestType',
        description: 'TestDescription',
        typeNames: ['Object1', 'Object2'],
        resolveType: (): null => null,
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
  ...CORE_APPS,
];

export const inputElementModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'ObjectType',
        fields: {
          textField: {
            typeName: 'String',
            inputElementType: InputElementType.TEXT,
          },
          textAreaField: {
            typeName: 'String',
            inputElementType: InputElementType.TEXTAREA,
          },
          markdownField: {
            typeName: 'String',
            inputElementType: InputElementType.MARKDOWN,
          },
          passwordField: {
            typeName: 'String',
            inputElementType: InputElementType.PASSWORD,
          },
        },
      },
      {
        kind: TypeKind.INTERFACE,
        name: 'InterfaceType',
        resolveType(): string {
          return '';
        },
        fields: {
          textField: {
            typeName: 'String',
            inputElementType: InputElementType.TEXT,
          },
          textAreaField: {
            typeName: 'String',
            inputElementType: InputElementType.TEXTAREA,
          },
          markdownField: {
            typeName: 'String',
            inputElementType: InputElementType.MARKDOWN,
          },
          passwordField: {
            typeName: 'String',
            inputElementType: InputElementType.PASSWORD,
          },
        },
      },
      /*
      {
        kind: TypeKind.INPUT_OBJECT,
        name: 'InputType',
        description: 'TestDescription',
        fields: {

        },
      }*/
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
  ...CORE_APPS,
];

export const directiveModules: ModuleConfig[] = [
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    types: [],
    directives: [
      {
        name: 'testDirective',
        description: 'My fancy \ndescription',
        locations: [
          DirectiveLocation.FIELD_DEFINITION,
          DirectiveLocation.ARGUMENT_DEFINITION,
        ],
        arguments: {
          input: {
            typeName: 'String',
            list: [true, false],
            required: true,
            description: 'Arg description',
          },
          input2: {
            typeName: 'String',
            required: false,
            description: 'Arg description',
            defaultValue: 'Test value',
          },
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
  ...CORE_APPS,
];
