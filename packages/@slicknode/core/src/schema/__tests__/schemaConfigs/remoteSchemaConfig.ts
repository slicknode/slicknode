/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import CoreModule from '../../../modules/core';
import RelayModule from '../../../modules/relay';
import AuthModule from '../../../modules/auth';
import * as uuid from 'uuid';
import { ModuleKind, ModuleConfig, TypeKind } from '../../../definition';
import { HANDLER_POSTGRES } from '../../handler';

const modules: ModuleConfig[] = [
  CoreModule,
  RelayModule,
  AuthModule,
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    namespace: 'Test',
    types: [],
    listeners: [],
    rawSchema: `
      schema {
        query: QueryRoot
        mutation: Mutation
      }

      type QueryRoot {
        "A simple type for getting started!"
        hello: String
        
        posts(limit: Int): Post
      }
      
      type Post {
        id: ID!
        title: String!
        """Type field descriptions"""
        text: String
        postInputArgs(url: [[String!]]): String
        keywords: [String]!
        multiDimensionalList: [[[ID!]]!]
        nullableArray: [Post]
        deprecatedField: String @deprecated(reason: "Obsolete")
      }
      
      interface TestInterface {
        """TestInterface iField description"""
        iField: [String]!
      }
      
      interface Interface2 {
        iField2: String
      }
      
      type UnionA {
        fieldA: String
      }
      
      type UnionB {
        fieldB: String
      }
      
      """Union type description"""
      union UnionType = UnionA | UnionB
      
      enum Enum1 {
        VAL1
        VALUE_2
        """Enum Value Description"""
        enumCamelCaseValue
      }
      
      input MutationInput {
        id: ID!
        title: [[String!]]
      }
      
      type ImplementingType implements TestInterface {
        iField: [String]!
        string: String
      }
      
      type MultiInterfaceType implements TestInterface & Interface2 {
        iField: [String]!
        iField2: String
      }
      
      type Mutation {
        testMutation(input: MutationInput): UnionType
        createPost(title: String!): Post
      }
      
      scalar DateTime
    `,
    remoteModule: {
      endpoint: 'http://localhost',
      headers: {
        some: 'header',
        'with-variable': 'Original',
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
  {
    id: uuid.v1(),
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,

    namespace: 'Internal',
    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'Internal_Comment',
        handler: {
          kind: HANDLER_POSTGRES,
        },
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          postId: {
            typeName: 'String',
            required: true,
          },
          text: {
            typeName: 'String',
            required: true,
          },
        },
        interfaces: ['Node'],
      },
    ],
    typeExtensions: {
      // eslint-disable-next-line camelcase
      Test_Post: {
        authorName: {
          typeName: 'String',
          required: true,
          resolve() {
            return 'John Doe';
          },
        },
      },
    },
    connections: [
      {
        name: 'comments',
        source: {
          typeName: 'Test_Post',
          keyField: 'id',
        },
        edge: {
          sourceField: 'postId',
        },
        node: {
          typeName: 'Internal_Comment',
        },
      },
    ],
    listeners: [],
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
