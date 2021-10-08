/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import CoreModule from '../../../modules/core';
import RelayModule from '../../../modules/relay';
import ContentModule from '../../../modules/content';
import AuthModule from '../../../modules/auth';
import Node from '../../../modules/relay/types/Node';
import uuid from 'uuid';
import {
  TypeKind,
  RFDefinitionKind,
  ModuleKind,
  FieldAccess,
  FunctionKind,
  ModuleConfig,
} from '../../../definition';
import { HANDLER_POSTGRES } from '../../handler';
import { GraphQLObjectType } from 'graphql';
import { Role } from '../../../auth';
import Content from '../../../modules/content/types/Content';
import { update } from 'lodash';

const modules: ModuleConfig[] = [
  CoreModule,
  RelayModule,
  ContentModule,
  AuthModule,
  {
    id: 'test-app',
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          stringField: { typeName: 'String' },
          requiredStringField: {
            typeName: 'String',
            required: true,
          },
          intField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          booleanField: { typeName: 'Boolean' },
          idField: { typeName: 'ID' },
          enumField: { typeName: 'TestEnum' },
          requiredEnumField: { typeName: 'TestEnum', required: true },
          referencedField: {
            typeName: 'ReferencedType',
          },
          requiredReferencedField: {
            typeName: 'ReferencedType',
            required: true,
          },
          listFieldRequired: {
            typeName: 'String',
            list: true,
            required: true,
          },
          listField: {
            typeName: 'String',
            list: true,
            required: false,
          },
          listFieldRequiredInnerNull: {
            typeName: 'String',
            list: [false],
            required: true,
          },
          listFieldInnerNull: {
            typeName: 'String',
            list: [false],
            required: false,
          },
          listField2d: {
            typeName: 'String',
            list: [false, true],
            required: false,
          },
          listField3d: {
            typeName: 'String',
            list: [true, false, true],
            required: true,
          },
          argTest: {
            typeName: 'String',
            arguments: {
              listFieldRequired: {
                typeName: 'String',
                list: true,
                required: true,
              },
              listField: {
                typeName: 'String',
                list: true,
                required: false,
              },
              listFieldRequiredInnerNull: {
                typeName: 'String',
                list: [false],
                required: true,
              },
              listFieldInnerNull: {
                typeName: 'String',
                list: [false],
                required: false,
              },
              listField2d: {
                typeName: 'String',
                list: [false, true],
                required: false,
              },
              listField3d: {
                typeName: 'String',
                list: [true, false, true],
                required: true,
              },
            },
          },
        },
      },
      {
        kind: TypeKind.OBJECT,
        name: 'TestContentNode',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          text: {
            typeName: 'String',
          },
          ...Content.fields,
        },
        interfaces: ['Node', 'Content'],
        permissions: [{ role: Role.AUTHENTICATED }],
        mutations: {
          create: [{ role: Role.AUTHENTICATED }],
          update: [{ role: Role.AUTHENTICATED }],
          delete: [{ role: Role.AUTHENTICATED }],
          publish: [{ role: Role.AUTHENTICATED }],
          unpublish: [{ role: Role.AUTHENTICATED }],
        },
      },
      {
        kind: TypeKind.OBJECT,
        name: 'TestNode',
        description: 'TestDescription',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          stringField: { typeName: 'String' },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'Namespace_TestNode',
        description: 'TestDescription',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          stringField: { typeName: 'String' },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'TestNodeNoHandler',
        description: 'TestDescription',
        fields: {
          ...Node.fields,
          stringField: { typeName: 'String' },
        },
        interfaces: ['Node'],
      },
      {
        kind: TypeKind.OBJECT,
        name: 'ReferencedType',
        description: 'ReferencedTypeDescription',
        fields: {
          stringField: { typeName: 'String' },
        },
      },
      {
        kind: TypeKind.OBJECT,
        name: 'FieldAccessTestNode',
        description: 'TestDescription',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          ...Node.fields,
          readOnlyField: {
            typeName: 'String',
            access: [FieldAccess.READ],
          },
          updateOnlyField: {
            typeName: 'String',
            access: [FieldAccess.UPDATE],
          },
          createOnlyField: {
            typeName: 'String',
            access: [FieldAccess.CREATE],
          },
        },
        interfaces: ['Node'],
        mutations: {
          create: [{ role: Role.ANONYMOUS }],
          delete: [{ role: Role.ANONYMOUS }],
          update: [{ role: Role.ANONYMOUS }],
        },
      },
      {
        kind: TypeKind.ENUM,
        name: 'TestEnum',
        description: 'Test enum description',
        values: {
          ONE: {
            value: 1,
            description: 'One Description',
            deprecationReason: 'Deprecation reason',
            //color: '00ff00',
          },
          TWO: {
            value: '2',
            // color: 'ff00cc',
          },
        },
      },
      {
        kind: TypeKind.UNION,
        name: 'TestUnion',
        description: 'Test union description',
        typeNames: ['TestType', 'ReferencedType'],
        resolveType: (): GraphQLObjectType | null => {
          throw new Error('test');
        },
      },
      {
        kind: TypeKind.INPUT_OBJECT,
        name: 'TestInputObject',
        description: 'Test input type',
        fields: {
          requiredField: { typeName: 'String', required: true },
          optionalField: { typeName: 'Boolean' },
        },
      },
    ],
    typeExtensions: {
      Viewer: {
        test: {
          typeName: 'TestType',
        },
      },
      Query: {
        hello: {
          typeName: 'String',
          arguments: {
            name: {
              typeName: 'String',
            },
          },
        },
      },
    },
    mutations: [
      {
        name: 'testMutation',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testCustomOutputMutation',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        outputTypeName: 'String',
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testCustomOutputObjectMutation',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        outputTypeName: 'ReferencedType',
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testCustomMutationWithoutResolver',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        outputTypeName: 'ReferencedType',
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testCustomInputMutation',
        inputFields: {},
        inputTypeName: 'TestInputObject',
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testNativeHooks',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      {
        name: 'testNativeHooksReturningData',
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            description: 'description',
          },
        },
        fields: {
          result: {
            typeName: 'String',
            required: true,
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      },
      ...[
        'testRuntimeHooks',
        'testRuntimeHooksReturningData',
        'testRuntimeHooksReturningInvalidData',
        'testRuntimeHooksThrowingError',
      ].map((name) => ({
        name,
        inputFields: {
          stringInput: {
            typeName: 'String',
            required: true,
            label: 'label',
            description: 'description',
          },
        },
        fields: {
          result: {
            typeName: 'String',
            required: true,
            label: 'Label',
            description: 'Description',
          },
        },
        async mutate(input: {
          [x: string]: any;
        }): Promise<{
          [x: string]: any;
        }> {
          return {
            result: 'Result' + input.stringInput,
          };
        },
        permissions: [
          {
            role: Role.ANONYMOUS,
          },
        ],
      })),
    ],
    functions: {
      preMutation: {
        kind: FunctionKind.HTTP,
        // mutationName: 'testMutation',
        url: 'http://dummyhost/pre',
        method: 'POST',
        params: {
          param1: 'value1',
        },
        headers: {
          'X-Beaver-Header': 'testHeader',
        },
      },
      postMutation: {
        kind: FunctionKind.HTTP,
        url: 'http://dummyhost/post',
        method: 'POST',
        params: {
          param1: 'value1',
        },
        headers: {
          'X-Beaver-Header': 'testHeader',
        },
        // query: '{result}',
      },
      preNativeMutation: {
        kind: FunctionKind.NATIVE,
        execute: async () => {},
      },
      postNativeMutation: {
        kind: FunctionKind.NATIVE,
        execute: async () => {},
      },
      preRuntimeMutation: {
        kind: FunctionKind.RUNTIME,
        handler: 'src/preMutation.js',
      },
      postRuntimeMutation: {
        kind: FunctionKind.RUNTIME,
        handler: 'src/postMutation.js',
      },
      preMutationReturningData: {
        kind: FunctionKind.NATIVE,
        async execute(payload: {
          args: {
            [x: string]: any;
          };
        }) {
          return {
            args: {
              ...payload.args,
              input: {
                stringInput: payload.args.input.stringInput + ' changed',
              },
            },
          };
        },
      },
      preMutationReturningDataWithError: {
        kind: FunctionKind.NATIVE,
        async execute() {
          throw new Error('Input error');
        },
      },
      preMutationReturningInvalidData: {
        kind: FunctionKind.NATIVE,
        async execute(payload: {
          args: {
            [x: string]: any;
          };
        }) {
          return {
            args: {
              ...payload.args,
              input: {
                stringInput: null,
              },
            },
          };
        },
      },
      customResolver: {
        kind: FunctionKind.NATIVE,
        execute: async (payload: {
          args: {
            [x: string]: any;
          };
        }) => {
          return {
            data: payload.args.name ? payload.args.name : 'world',
          };
        },
      },
      testCustomOutputObjectMutation: {
        kind: FunctionKind.NATIVE,
        execute: async (payload: {
          args: {
            [x: string]: any;
          };
        }) => {
          return {
            data: {
              stringField: payload.args.input.stringInput + ' test',
            },
          };
        },
      },
    },
    resolvers: {
      Query: {
        hello: {
          handler: 'customResolver',
        },
      },
      Mutation: {
        testCustomOutputObjectMutation: {
          handler: 'testCustomOutputObjectMutation',
        },
      },
    },
    listeners: [
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testMutation',
        handler: 'preMutation',
      },
      {
        kind: RFDefinitionKind.POST_MUTATION,
        mutationName: 'testMutation',
        query: '{result}',
        handler: 'postMutation',
      },
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testNativeHooks',
        handler: 'preNativeMutation',
      },
      {
        kind: RFDefinitionKind.POST_MUTATION,
        mutationName: 'testNativeHooks',
        query: '{result}',
        handler: 'postNativeMutation',
      },
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testRuntimeHooks',
        handler: 'preRuntimeMutation',
      },
      {
        kind: RFDefinitionKind.POST_MUTATION,
        mutationName: 'testRuntimeHooks',
        query: '{result}',
        handler: 'postRuntimeMutation',
      },
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testRuntimeHooksReturningData',
        handler: 'preMutationReturningData',
        returnsInputData: true,
        priority: 10,
      },
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testRuntimeHooksReturningInvalidData',
        handler: 'preMutationReturningInvalidData',
        returnsInputData: true,
        priority: 10,
      },
      {
        kind: RFDefinitionKind.PRE_MUTATION,
        mutationName: 'testRuntimeHooksThrowingError',
        handler: 'preMutationReturningDataWithError',
        returnsInputData: true,
        priority: 10,
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
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [],
    listeners: [],
    typePermissions: {
      TestNode: {
        permissions: [{ role: Role.ADMIN }],
      },
      Mutation: {
        permissions: [
          {
            role: Role.ADMIN,
            fields: ['testCustomOutputObjectMutation'],
          },
        ],
      },
    },
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
