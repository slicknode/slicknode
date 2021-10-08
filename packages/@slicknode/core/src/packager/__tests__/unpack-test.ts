/**
 * Created by Ivo Meißner on 10.09.17.
 *
 */

import unpack, { DEFAULT_PERMISSIONS } from '../unpack';
import { getArchive } from './testProjects';
import {
  ConnectionConfig,
  FieldAccess,
  FieldConfigMap,
  FunctionKind,
  RFDefinitionKind,
  ModuleConfig,
  ObjectTypePermissionSet,
  TypeConfig,
  TypeKind,
} from '../../definition';
import { HANDLER_POSTGRES } from '../../schema/handler';
import { expect } from 'chai';
import { InputElementType } from '../../definition/InputElementType';
import Node from '../../modules/relay/types/Node';
import { Role } from '../../auth';

describe('unpack project', () => {
  it('adds simple union type', async () => {
    await expectHasTypeConfig('union-type', {
      name: 'Test_Union',
      kind: TypeKind.UNION,
      description: 'Union description',
      typeNames: ['Test_Type1', 'Test_Type2'],
    });
  });

  it('succeeds for initialized project', (done) => {
    async function run() {
      await unpack(await getArchive('initialized-project'));
    }
    run().then(done).catch(done);
  });

  it('fails for empty folder', (done) => {
    expectFailsWithErrors('empty-folder', ['Package has no slicknode.yml file'])
      .then(done)
      .catch(done);
  });

  it('fails for invalid native module name', (done) => {
    expectFailsWithErrors('unknown-native-app', [
      'Unknown module "invalid-app" in slicknode.yml',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for missing slicknode.yml', (done) => {
    expectFailsWithErrors('missing-app-json', [
      'Module "@private/test-app" does not have a slicknode.yml',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid slicknode.yml', (done) => {
    expectFailsWithErrors('invalid-app-json', [
      'Could not parse slicknode.yml for app "@private/test-app": unexpected end of the stream within a flow collection at line 3, column 1',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for syntax error in schema.graphql', (done) => {
    expectFailsWithErrors('invalid-schema-graphql', [
      'Could not parse schema.graphql of module "@private/test-app": Syntax Error: Unexpected Name "invalid"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for unsupported AST node in schema.graphql', (done) => {
    expectFailsWithErrors('schema-unsupported-nodes', [
      'Unsupported definition OperationDefinition in schema.graphql of module "@private/test-app"',
    ])
      .then(done)
      .catch(done);
  });

  it('adds simple object type with content interface', (done) => {
    expectHasTypeConfig('content-type', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      interfaces: ['Content', 'Node'],
      fields: {
        title: {
          typeName: 'String',
          required: false,
          list: false,
        },
        contentNode: {
          description:
            'The main content node that groups the nodes with individual translations',
          access: [FieldAccess.READ, FieldAccess.CREATE],
          list: false,
          required: true,
          typeName: 'ContentNode',
        },
        createdAt: {
          description: 'The time when the object was first added',
          access: [FieldAccess.READ],
          list: false,
          required: true,
          typeName: 'DateTime',
        },
        createdBy: {
          description: 'The user that created the node',
          access: [FieldAccess.READ],
          list: false,
          required: false,
          typeName: 'User',
        },
        id: Node.fields.id,
        lastUpdatedAt: {
          description: 'The time when the object was last updated',
          typeName: 'DateTime',
          access: [FieldAccess.READ],
          list: false,
          required: false,
        },
        lastUpdatedBy: {
          description: 'The user that last updated the node',
          access: [FieldAccess.READ],
          list: false,
          required: false,
          typeName: 'User',
        },
        locale: {
          description: 'The locale of the content node',
          access: [FieldAccess.READ, FieldAccess.CREATE],
          typeName: 'Locale',
          required: true,
          list: false,
        },
        publishedAt: {
          description: 'The time when the node was last published',
          access: [FieldAccess.READ],
          list: false,
          required: false,
          typeName: 'DateTime',
        },
        publishedBy: {
          description: 'The user that published the node',
          access: [FieldAccess.READ],
          list: false,
          required: false,
          typeName: 'User',
        },
        status: {
          description: 'The current status of the node',
          typeName: 'ContentStatus',
          access: [FieldAccess.READ],
          required: true,
          list: false,
        },
      },
      ...DEFAULT_PERMISSIONS,
    })
      .then(done)
      .catch(done);
  });

  it('adds simple object type', (done) => {
    expectHasTypeConfig('object-type', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      fields: {
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds simple object type with custom resolver', (done) => {
    expectHasTypeConfig('object-type-with-custom-resolver', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      fields: {
        id: {
          ...Node.fields.id,
          description: 'ID description',
        },
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
        extension: {
          typeName: 'String',
          required: true,
          list: false,
          access: [FieldAccess.READ],
        },
      },
      handler: {
        kind: HANDLER_POSTGRES,
      },
      ...DEFAULT_PERMISSIONS,
      interfaces: ['Node'],
    })
      .then(done)
      .catch(done);
  });

  it('adds extension with custom resolver', async () => {
    await expectHasTypeExtensionConfig(
      'extend-type-with-custom-resolver',
      '@private/test-app',
      {
        User: {
          Test_someField: {
            typeName: 'String',
            required: false,
            list: false,
            access: [FieldAccess.READ],
          },
        },
      }
    );
  });

  it('adds simple object type with Node interface', (done) => {
    expectHasTypeConfig('object-type-with-node-interface', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: {
          ...Node.fields.id,
          description: 'ID description',
        },
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
      },
      interfaces: ['Node'],
      ...DEFAULT_PERMISSIONS,
    })
      .then(done)
      .catch(done);
  });

  it('adds object type with different fields', (done) => {
    expectHasTypeConfig('different-field-types', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      fields: {
        string: { typeName: 'String', required: false, list: false },
        stringList: { typeName: 'String', required: false, list: true },
        requiredString: { typeName: 'String', required: true, list: false },
        requiredStringList: { typeName: 'String', required: true, list: true },
        otherType: { typeName: 'Test_OtherType', required: false, list: false },
        otherTypeList: {
          typeName: 'Test_OtherType',
          required: false,
          list: true,
        },
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds composite index for multiple fields', async () => {
    await expectHasTypeConfig('object-type-with-composite-index', {
      name: 'Test_TestMulti',
      kind: TypeKind.OBJECT,
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
        },
        text: {
          typeName: 'String',
          required: false,
          list: false,
        },
      },
      interfaces: ['Node'],
      indexes: [{ fields: ['title', 'text'] }],
      ...DEFAULT_PERMISSIONS,
    });
  });

  it('adds multiple composite indexes for multiple fields', async () => {
    await expectHasTypeConfig('object-type-with-composite-index', {
      name: 'Test_TestMultiIndex',
      kind: TypeKind.OBJECT,
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
        },
        text: {
          typeName: 'String',
          required: false,
          list: false,
        },
      },
      interfaces: ['Node'],
      indexes: [
        { fields: ['title', 'text'] },
        { fields: ['title'] },
        { fields: ['title', 'id'], unique: true },
      ],
      ...DEFAULT_PERMISSIONS,
    });
  });

  it('adds composite index for single field', async () => {
    await expectHasTypeConfig('object-type-with-composite-index', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
      },
      interfaces: ['Node'],
      indexes: [{ fields: ['title'] }],
      ...DEFAULT_PERMISSIONS,
    });
  });

  it('adds auto complete index for single field', async () => {
    await expectHasTypeConfig('object-type-with-autocomplete', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
      },
      interfaces: ['Node'],
      autoCompleteFields: ['title'],
      ...DEFAULT_PERMISSIONS,
    });
  });

  it('adds auto complete index for multiple fields', async () => {
    await expectHasTypeConfig('object-type-with-autocomplete', {
      name: 'Test_TestMulti',
      kind: TypeKind.OBJECT,
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
        },
        text: {
          typeName: 'String',
          required: false,
          list: false,
        },
      },
      interfaces: ['Node'],
      autoCompleteFields: ['title', 'text'],
      ...DEFAULT_PERMISSIONS,
    });
  });

  it('adds object type with field input element types', (done) => {
    expectHasTypeConfig('object-type-input-elements', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      fields: {
        text: {
          typeName: 'String',
          required: false,
          list: false,
          inputElementType: InputElementType.TEXT,
          description: 'Test title',
        },
        password: {
          typeName: 'String',
          required: false,
          list: false,
          inputElementType: InputElementType.PASSWORD,
        },
        textarea: {
          typeName: 'String',
          required: false,
          list: false,
          inputElementType: InputElementType.TEXTAREA,
        },
        markdown: {
          typeName: 'String',
          required: false,
          list: false,
          inputElementType: InputElementType.MARKDOWN,
        },
      },
    })
      .then(done)
      .catch(done);
  });

  it('fails for invalid input element type', (done) => {
    expectFailsWithErrors('object-type-invalid-input-elements', [
      'Invalid use of directive @input on field "text": Argument "type" has invalid value INVALID_INPUT',
    ])
      .then(done)
      .catch(done);
  });

  it('adds object type with interface', (done) => {
    expectHasTypeConfig('object-type-with-interface', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
      },
      interfaces: ['Node'],
      ...DEFAULT_PERMISSIONS,
    })
      .then(done)
      .catch(done);
  });

  it('adds object type with multiple interfaces', (done) => {
    expectHasTypeConfig('object-type-with-multiple-interfaces', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        createdAt: {
          access: [FieldAccess.READ],
          list: false,
          required: true,
          defaultValue: 'now',
          typeName: 'DateTime',
        },
        id: {
          ...Node.fields.id,
          description: 'Test title',
        },
        lastUpdatedAt: {
          access: [FieldAccess.READ],
          list: false,
          required: false,
          typeName: 'DateTime',
        },
        title: {
          list: false,
          required: false,
          typeName: 'String',
        },
      },
      interfaces: ['Node', 'TimeStampedInterface'],
      ...DEFAULT_PERMISSIONS,
    })
      .then(done)
      .catch(done);
  });

  it('fails with permissions for unknown type', (done) => {
    expectFailsWithErrors('permissions-unknown-type', [
      'Permissions for type "UnknownType" were defined in module "@private/test-app" but the type does not exist in your project. Remove the obsolete permission document.',
    ])
      .then(done)
      .catch(done);
  });

  it('adds simple node permissions', (done) => {
    expectHasTypeConfig('permissions-simple', {
      name: 'Test_Node',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
        user: { typeName: 'User', required: false, list: false },
      },
      mutations: {
        create: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        delete: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        update: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        publish: [],
        unpublish: [],
      },
      permissions: [
        {
          query:
            'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
          role: 1,
        },
      ],
      interfaces: ['Node'],
    })
      .then(done)
      .catch(done);
  });

  it('adds publish node permissions', async () => {
    await expectHasTypeConfig('permissions-publish', {
      name: 'Test_Node',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      handler: {
        kind: HANDLER_POSTGRES,
      },
      fields: {
        id: Node.fields.id,
        title: {
          typeName: 'String',
          required: false,
          list: false,
          description: 'Test title',
        },
        user: { typeName: 'User', required: false, list: false },
      },
      mutations: {
        create: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        delete: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        update: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        publish: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
        unpublish: [
          {
            query:
              'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
            role: 1,
          },
        ],
      },
      permissions: [
        {
          query:
            'query Test_NodePermission1($user_id: ID!) {\n  node(filter: {user: {id: {eq: $user_id}}})\n}',
          role: 1,
        },
      ],
      interfaces: ['Node'],
    });
  });

  it('adds type permissions across modules', (done) => {
    expectHasTypePermissions(
      'permissions-across-modules',
      '@private/test-app',
      {
        User: {
          mutations: {
            create: [
              {
                query:
                  'query UserPermission1($user_id: ID!) {\n  node(filter: {id: {eq: $user_id}})\n}',
                role: 1,
              },
            ],
            delete: [
              {
                query:
                  'query UserPermission1($user_id: ID!) {\n  node(filter: {id: {eq: $user_id}})\n}',
                role: 1,
              },
            ],
            update: [
              {
                query:
                  'query UserPermission1($user_id: ID!) {\n  node(filter: {id: {eq: $user_id}})\n}',
                role: 1,
              },
            ],
            publish: [],
            unpublish: [],
          },
          permissions: [
            {
              query:
                'query UserPermission1($user_id: ID!) {\n  node(filter: {id: {eq: $user_id}})\n}',
              role: 1,
            },
          ],
        },
      }
    )
      .then(done)
      .catch(done);
  });

  it('adds field directives', (done) => {
    expectHasTypeConfig('field-directives', {
      name: 'Test_Test',
      kind: TypeKind.OBJECT,
      description: 'Test type',
      fields: {
        uniqueIndexedField: {
          typeName: 'String',
          required: false,
          list: false,
          unique: true,
          index: true,
        },
        uniqueField: {
          typeName: 'String',
          required: false,
          list: false,
          unique: true,
        },
        indexedField: {
          typeName: 'String',
          required: false,
          list: false,
          index: true,
        },
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds enum type', (done) => {
    expectHasTypeConfig('enum-type', {
      name: 'Test_Test',
      kind: TypeKind.ENUM,
      description: 'Test type',
      values: {
        FIRST: {
          description: 'First description',
          value: 'FIRST',
        },
        SECOND: {
          description: 'Second description',
          value: 'SECOND',
        },
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds connection one-to-many with string join key', async () => {
    await expectHasConnectionConfig('relation-stringfield-one-to-many', {
      name: 'comments',
      source: {
        typeName: 'Test_Article',
        keyField: 'joinKey',
      },
      edge: {
        sourceField: 'joinKey',
      },
      node: {
        typeName: 'Test_Comment',
      },
    });
  });

  it('adds connection config without edge type', (done) => {
    expectHasConnectionConfig('relation-inline', {
      name: 'comments',
      source: {
        typeName: 'Test_Article',
      },
      edge: {
        sourceField: 'article',
      },
      node: {
        typeName: 'Test_Comment',
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds connection via edge type', (done) => {
    expectHasConnectionConfig('relation-via-edge', {
      name: 'groups',
      source: {
        typeName: 'Test_Member',
      },
      edge: {
        typeName: 'Test_Membership',
        sourceField: 'member',
        nodeField: 'group',
      },
      node: {
        typeName: 'Test_Group',
      },
    })
      .then(done)
      .catch(done);
  });

  it('adds connection via edge type with custom key', (done) => {
    expectHasConnectionConfig('relation-via-edge-custom-key', {
      name: 'groups',
      source: {
        typeName: 'Test_Member',
        keyField: 'key',
      },
      edge: {
        typeName: 'Test_Membership',
        sourceField: 'memberKey',
        nodeField: 'groupKey',
      },
      node: {
        typeName: 'Test_Group',
        keyField: 'key',
      },
    })
      .then(done)
      .catch(done);
  });

  it('fails for invalid relation path', (done) => {
    expectFailsWithErrors('relation-invalid-path', [
      'Invalid relation path format on field "groups" of type "Member": "faultypath"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid relation path arg type', (done) => {
    expectFailsWithErrors('relation-invalid-path-argtype', [
      'Invalid use of directive @relation on field "groups" of type "Member": Argument "path" has invalid value 123',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid relation type in path', (done) => {
    expectFailsWithErrors('relation-invalid-path-type', [
      'Invalid relation path format on field "groups" of type "Member": It has to start with "Member"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid enum directive', (done) => {
    expectFailsWithErrors('enum-type-unknown-directive', [
      'Unknown directive "unknownDirective" on enum "Test"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid enum value directive', (done) => {
    expectFailsWithErrors('enum-type-unknown-value-directive', [
      'Unknown directive "unknownDirective" on value "FIRST" of enum "Test"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for nested list fields in schema.graphql', (done) => {
    expectFailsWithErrors('multi-dimensional-list-field', [
      'Multi dimensional lists are not supported',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid type directive', (done) => {
    expectFailsWithErrors('object-type-unknown-directive', [
      'Invalid directive "someDirective" on type "Test"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid field directive', (done) => {
    expectFailsWithErrors('object-type-unknown-field-directive', [
      'Unknown directive "someDirective" on field "title"',
    ])
      .then(done)
      .catch(done);
  });
  /*
  @TODO: Add validation for connections with type extensions
  it('adds related fields', done => {
    expectHasTypeExtensionConfig('extend-type',
      '@private/extended-app',
      {
        Test: {
          extendedField: {
            description: 'Test extension',
            typeName: 'String',
            list: false,
            required: false,
          }
        },
        User: {
          test: {
            list: false,
            typeName: 'Test',
            required: false,
          }
        },
      }
    ).then(done).catch(done);
  });
  it('adds connection from type extensions', done => {
    expectHasConnectionConfig('extend-type', {
      name: 'users',
      source: {
        typeName: 'Test',
      },
      edge: {
        sourceField: 'test',
      },
      node: {
        typeName: 'User',
      }
    }).then(done).catch(done);
  });
  */

  it('fails for invalid runtime engine', (done) => {
    expectFailsWithErrors('runtime-invalid-engine', [
      'Invalid value at path "runtime,engine": "runtime.engine" must be',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid runtime memory', (done) => {
    expectFailsWithErrors('runtime-invalid-memory', [
      'Invalid value at path "runtime,memory": "runtime.memory" must be one of',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid listener handler on before mutation event', (done) => {
    expectFailsWithErrors('listeners-before-mutation-invalid-handler', [
      'Invalid value at path "listeners,0": "listeners[0]" does not match any of the allowed types',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid listener event', (done) => {
    expectFailsWithErrors('listeners-invalid-event', [
      'Invalid value at path "listeners,0": "listeners[0]" does not match any of the allowed types',
    ])
      .then(done)
      .catch(done);
  });

  it('adds after mutation listener', (done) => {
    async function runTest() {
      const config = await unpack(await getArchive('listeners-after-mutation'));
      if (config.errors.length) {
        expect(config.errors.length).to.equal(
          0,

          `Error checking for post mutation listener: ${config.errors[0].message}`
        );
      }

      // Check if listener was created
      const moduleConfig = config.modules.find(
        (module) => module.id === '@private/test-app'
      );
      if (!moduleConfig) {
        throw new Error('Module was not found');
      }

      // Check if runtime was configured
      expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

      expect(moduleConfig.listeners).to.deep.equal([
        {
          handler: 'runtime:src/myHook.js',
          kind: RFDefinitionKind.POST_MUTATION,
          mutationName: 'uploadImage',
          query: '{node{id}}\n',
        },
      ]);
      expect(moduleConfig.functions).to.deep.equal({
        'runtime:src/myHook.js': {
          handler: 'src/myHook.js',
          kind: FunctionKind.RUNTIME,
        },
      });
    }
    runTest().then(done).catch(done);
  });

  it('adds before mutation listener', (done) => {
    async function runTest() {
      const config = await unpack(
        await getArchive('listeners-before-mutation')
      );
      if (config.errors.length) {
        expect(config.errors.length).to.equal(
          0,

          `Error checking for post mutation listener: ${config.errors[0].message}`
        );
      }

      // Check if listener was created
      const moduleConfig = config.modules.find(
        (module) => module.id === '@private/test-app'
      );
      if (!moduleConfig) {
        throw new Error('Module was not found');
      }

      // Check if runtime was configured
      expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

      expect(moduleConfig.listeners).to.deep.equal([
        {
          handler: 'runtime:src/myHook.js',
          kind: RFDefinitionKind.PRE_MUTATION,
          mutationName: 'uploadImage',
        },
      ]);
      expect(moduleConfig.functions).to.deep.equal({
        'runtime:src/myHook.js': {
          handler: 'src/myHook.js',
          kind: FunctionKind.RUNTIME,
        },
      });
    }
    runTest().then(done).catch(done);
  });

  it('adds custom mutation', async () => {
    const config = await unpack(await getArchive('mutation-simple'));
    if (config.errors.length) {
      expect(config.errors.length).to.equal(
        0,

        `Error checking for custom mutation: ${config.errors[0].message}`
      );
    }

    // Check if listener was created
    const moduleConfig = config.modules.find(
      (module) => module.id === '@private/test-app'
    );
    if (!moduleConfig) {
      throw new Error('Module was not found');
    }

    expect(moduleConfig.mutations).to.deep.equal([
      {
        name: 'Test_testMutation',
        fields: {},
        permissions: [],
        inputFields: {},
        description: 'Some description',
        outputTypeName: 'String',
        inputTypeName: 'Test_TestMutationInput',
      },
    ]);

    // Check if runtime was configured
    expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

    expect(moduleConfig.resolvers).to.deep.equal({
      Mutation: {
        testMutation: {
          // eslint-disable-line camelcase
          handler: 'runtime:src/resolvers/testMutation',
        },
      },
    });
    expect(moduleConfig.functions).to.deep.equal({
      'runtime:src/resolvers/testMutation': {
        handler: 'src/resolvers/testMutation',
        kind: FunctionKind.RUNTIME,
      },
    });
  });

  it('adds mutation permissions', async () => {
    const config = await unpack(await getArchive('mutation-permissions'));
    if (config.errors.length) {
      expect(config.errors.length).to.equal(
        0,

        `Error checking for custom mutation: ${config.errors[0].message}`
      );
    }

    // Check if listener was created
    const moduleConfig = config.modules.find(
      (module) => module.id === '@private/test-app'
    );
    if (!moduleConfig) {
      throw new Error('Module was not found');
    }

    expect(moduleConfig.mutations).to.deep.equal([
      {
        name: 'Test_testMutation',
        fields: {},
        permissions: [],
        inputFields: {},
        description: 'Some description',
        outputTypeName: 'String',
        inputTypeName: 'Test_TestMutationInput',
      },
    ]);

    // Check if runtime was configured
    expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

    expect(moduleConfig.resolvers).to.deep.equal({
      Mutation: {
        testMutation: {
          // eslint-disable-line camelcase
          handler: 'runtime:src/resolvers/testMutation',
        },
      },
    });
    expect(moduleConfig.functions).to.deep.equal({
      'runtime:src/resolvers/testMutation': {
        handler: 'src/resolvers/testMutation',
        kind: FunctionKind.RUNTIME,
      },
    });

    expect(moduleConfig.typePermissions).to.deep.equal({
      Mutation: {
        permissions: [
          { role: Role.AUTHENTICATED, fields: ['Test_testMutation'] },
        ],
        mutations: {
          create: [],
          update: [],
          delete: [],
          publish: [],
          unpublish: [],
        },
      },
    });
  });

  it('fails for mutation with operations scope in permissions', (done) => {
    expectFailsWithErrors('mutation-permissions-operations-field', [
      'Unknown argument "operations" on field "PermissionQuery.scope"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with multiple input arguments', (done) => {
    expectFailsWithErrors('mutation-multiple-input-args', [
      'Invalid input arguments for mutation "testMutation". Mutations have to have one input argument named "input".',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with list input argument', (done) => {
    expectFailsWithErrors('mutation-list-input-arg', [
      'Invalid input type for mutation "testMutation": Input type cannot be of type list',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with multi dimensional list payload', (done) => {
    expectFailsWithErrors('mutation-multi-dimensional-payload', [
      'List return types are not supported for mutations',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with non null payload', (done) => {
    expectFailsWithErrors('mutation-non-null-payload', [
      'Non NULL field types are not supported for mutations',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with multi dimensional input', (done) => {
    expectFailsWithErrors('mutation-multi-dimensional-input', [
      'Multi dimensional lists are not supported as field input arguments',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with no input', (done) => {
    expectFailsWithErrors('mutation-no-input', [
      'Invalid input arguments for mutation "testMutation". Mutations have to have one input argument named "input".',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for mutation with directive', (done) => {
    expectFailsWithErrors('mutation-directive', [
      'Unknown directive "unique" for mutation field "testMutation"',
    ])
      .then(done)
      .catch(done);
  });

  it('adds custom resolver', (done) => {
    async function runTest() {
      const config = await unpack(await getArchive('resolvers-query-field'));
      if (config.errors.length) {
        expect(config.errors.length).to.equal(
          0,

          `Error checking for custom resolver: ${config.errors[0].message}`
        );
      }

      // Check if listener was created
      const moduleConfig = config.modules.find(
        (module) => module.id === '@private/test-app'
      );
      if (!moduleConfig) {
        throw new Error('Module was not found');
      }

      // Check if runtime was configured
      expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

      expect(moduleConfig.resolvers).to.deep.equal({
        Query: {
          Test_simpleField: {
            // eslint-disable-line camelcase
            handler: 'runtime:src/resolvers/Test_simpleField',
          },
        },
      });
      expect(moduleConfig.functions).to.deep.equal({
        'runtime:src/resolvers/Test_simpleField': {
          handler: 'src/resolvers/Test_simpleField',
          kind: FunctionKind.RUNTIME,
        },
      });
    }
    runTest().then(done).catch(done);
  });

  it('fails for invalid resolver field name', (done) => {
    expectFailsWithErrors('resolvers-invalid-field-name', [
      'Invalid value at path "resolvers,Query,Test_simpleField.sdf": "resolvers.Query.Test_simpleField.sdf" is not allowed',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid resolver type name', (done) => {
    expectFailsWithErrors('resolvers-invalid-type-name', [
      'Invalid value at path "resolvers,Query.invalidname": "resolvers.Query.invalidname" is not allowed',
    ])
      .then(done)
      .catch(done);
  });

  it('adds custom resolver input arguments', (done) => {
    async function runTest() {
      const config = await unpack(
        await getArchive('resolvers-input-arguments')
      );
      if (config.errors.length) {
        expect(config.errors.length).to.equal(
          0,

          `Error checking for custom resolver: ${config.errors[0].message}`
        );
      }

      // Check if listener was created
      const moduleConfig = config.modules.find(
        (module) => module.id === '@private/test-app'
      );
      if (!moduleConfig) {
        throw new Error('Module was not found');
      }

      // Check if runtime was configured
      expect(moduleConfig.runtime.config.engine).to.equal('nodejs@8');

      expect(moduleConfig.resolvers).to.deep.equal({
        Query: {
          Test_simpleField: {
            // eslint-disable-line camelcase
            handler: 'runtime:src/resolvers/Test_simpleField',
          },
        },
      });
      expect(moduleConfig.functions).to.deep.equal({
        'runtime:src/resolvers/Test_simpleField': {
          handler: 'src/resolvers/Test_simpleField',
          kind: FunctionKind.RUNTIME,
        },
      });
      expect(moduleConfig.typeExtensions.Query.Test_simpleField).to.deep.equal({
        access: [FieldAccess.READ],
        arguments: {
          count: {
            list: false,
            required: false,
            typeName: 'Int',
          },
          name: {
            description: 'Description',
            list: false,
            required: true,
            typeName: 'String',
          },
        },
        list: false,
        required: false,
        typeName: 'String',
      });
    }
    runTest().then(done).catch(done);
  });

  it('adds settings type', (done) => {
    async function runTest() {
      const config = await unpack(await getArchive('settings-type'));
      if (config.errors.length) {
        expect(config.errors.length).to.equal(
          0,

          `Error checking for settings type: ${config.errors[0].message}`
        );
      }

      // Check if listener was created
      const moduleConfig = config.modules.find(
        (module) => module.id === '@private/test-app'
      );
      if (!moduleConfig) {
        throw new Error('Module was not found');
      }

      expect(moduleConfig.settings).to.deep.equal({
        name: 'SettingsType',
        kind: 6,
        fields: {
          apiKey: {
            required: true,
            list: false,
            description: 'Test Description',
            typeName: 'String',
          },
        },
      });
    }
    runTest().then(done).catch(done);
  });

  it('fails for invalid settings type', (done) => {
    expectFailsWithErrors('settings-invalid-type', [
      'Settings only support values of type `String`, `Float` and `Int`. Found type JSON for settings value apiKey',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for list settings type', (done) => {
    expectFailsWithErrors('settings-list-type', [
      'List values are not supported for settings. Use something like comma separated values instead for field apiKey',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for multiple settings types', (done) => {
    expectFailsWithErrors('settings-multiple-types', [
      'There is only one InputObjectTypeDefinition allowed in settings.graphql',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid settings document', (done) => {
    expectFailsWithErrors('settings-invalid-document', [
      'Error parsing settings document of module "@private/test-app": Syntax Error: Unexpected Name "drthoiujdrpthoij"',
    ])
      .then(done)
      .catch(done);
  });

  it('fails for invalid graphql node in settings', (done) => {
    expectFailsWithErrors('settings-invalid-graphql-node', [
      'Only InputObjectTypeDefinitions are supported for settings schema, got ObjectTypeDefinition',
    ])
      .then(done)
      .catch(done);
  });

  it('adds remote module', async () => {
    const config = await getModuleConfig('remote-module', '@private/test-app');
    expect(config.remoteModule).to.deep.equal({
      endpoint: 'http://localhost/graphql',
      headers: {
        Authorization: 'Bearer testtoken',
      },
    });
    expect(config.rawSchema).to.equal(
      'type Query {\n' +
        '  hello(name: String!): String\n' +
        '}\n' +
        '\n' +
        '\n' +
        'type SomeType implements Test {\n' +
        '  id: ID\n' +
        '  string: String\n' +
        '}\n' +
        '\n' +
        'interface Test {\n' +
        '  string: String\n' +
        '}\n'
    );
    expect((config.types || []).length).to.equal(0);
  });

  it('fails for syntax error in remote module', async () => {
    await expectFailsWithErrors('remote-module-syntax-error', [
      'Could not parse schema.graphql of module "@private/test-app": Syntax Error: Unexpected Name "invalid"',
    ]);
  });

  it('fails for invalid config in remote module', (done) => {
    expectFailsWithErrors('remote-module-invalid-config', [
      'Invalid value at path "module,remote,headers,_invalidheader": "module.remote.headers._invalidheader" is not allowed',
    ])
      .then(done)
      .catch(done);
  });
});

/**
 * Check if the provided errors are returned
 *
 * @param name
 * @param errors
 * @returns {Promise.<void>}
 */
async function expectFailsWithErrors(
  name: string,
  errors: Array<string>
): Promise<void> {
  const config = await unpack(await getArchive(name));

  expect(config.errors).to.not.equal(
    null,
    `No project config loaded. Check the project name: ${name}`
  );

  // Check if actual messages are expected
  const actualMessages = config.errors.map((e) => e.message);
  actualMessages.forEach((message) => {
    const matchingErrors = errors.filter((errMessage) =>
      message.includes(errMessage)
    );

    expect(matchingErrors.length).to.be.above(
      0,
      `Throws unexpected error: ${message}`
    );
  });

  // Check if all expected error messages are returned
  errors.forEach((message) => {
    const matchingErrors = actualMessages.filter((actualMessage) =>
      actualMessage.includes(message)
    );

    expect(matchingErrors.length).to.be.above(
      0,
      `Missing error in response: ${message}`
    );
  });

  expect(actualMessages.length).to.equal(errors.length);
}

/**
 * Validates if the project has the provided TypeConfig
 *
 * @param name
 * @param typeConfig
 * @returns {Promise.<void>}
 */
async function expectHasTypeConfig(
  name: string,
  typeConfig: TypeConfig
): Promise<void> {
  const config = await unpack(await getArchive(name));
  if (config.errors.length) {
    expect(config.errors.length).to.equal(
      0,

      `Error checking for type: ${config.errors[0].message}`
    );
  }

  // Find type
  let actualTypeConfig = null;
  config.modules.forEach((module) => {
    (module.types || []).forEach((type) => {
      if (type.name === typeConfig.name) {
        actualTypeConfig = type;
      }
    });
  });
  expect(actualTypeConfig).to.not.equal(
    null,

    `Type config for type ${typeConfig.name} not found in project`
  );

  expect(actualTypeConfig).to.deep.equal(
    typeConfig,
    'Type config does not match'
  );
}

/**
 * Validates if the project has the provided TypeConfig
 *
 * @param name
 * @param connectionConfig
 * @returns {Promise.<void>}
 */
async function expectHasConnectionConfig(
  name: string,
  connectionConfig: ConnectionConfig
): Promise<void> {
  const config = await unpack(await getArchive(name));
  if (config.errors.length) {
    expect(config.errors.length).to.equal(
      0,

      `Error checking for connection: ${config.errors[0].message}`
    );
  }

  // Find type
  let actualConnectionConfig = null;
  config.modules.forEach((module) => {
    (module.connections || []).forEach((connection) => {
      if (
        connection.name === connectionConfig.name &&
        connectionConfig.source.typeName === connection.source.typeName
      ) {
        actualConnectionConfig = connection;
      }
    });
  });
  expect(actualConnectionConfig).to.not.equal(
    null,

    `Connection config for ${connectionConfig.source.typeName}.${connectionConfig.name} not found in project`
  );

  expect(actualConnectionConfig).to.deep.equal(
    connectionConfig,
    'Connection config does not match'
  );
}

/**
 * Validates if the project has the related field configs
 *
 * @param name
 * @param appId
 * @param typeExtensions
 * @returns {Promise.<void>}
 */
// eslint-disable-next-line no-unused-vars
async function expectHasTypeExtensionConfig(
  name: string,
  appId: string,
  typeExtensions: {
    [key: string]: FieldConfigMap;
  }
): Promise<void> {
  const config = await unpack(await getArchive(name));
  if (config.errors.length) {
    expect(config.errors.length).to.equal(
      0,

      `Error checking for related fields: ${config.errors[0].message}`
    );
  }

  // Find type
  let actualTypeExtensionConfig = null;
  config.modules.forEach((module) => {
    if (module.id === appId) {
      actualTypeExtensionConfig = module.typeExtensions || null;
    }
  });
  expect(actualTypeExtensionConfig).to.not.equal(
    null,

    'Related fields config not found in project'
  );

  expect(actualTypeExtensionConfig).to.deep.equal(
    typeExtensions,
    'Related fields config does not match'
  );
}

/**
 * Validates if the project has the related typePermissions
 *
 * @param name
 * @param appId
 * @param typePermissions
 * @returns {Promise.<void>}
 */
async function expectHasTypePermissions(
  name: string,
  appId: string,
  typePermissions: {
    [typeName: string]: ObjectTypePermissionSet;
  }
): Promise<void> {
  const config = await unpack(await getArchive(name));
  if (config.errors.length) {
    expect(config.errors.length).to.equal(
      0,

      `Error checking for type permissions: ${config.errors[0].message}`
    );
  }

  // Find type
  let actualTypePermissions = null;
  config.modules.forEach((module) => {
    if (module.id === appId) {
      actualTypePermissions = module.typePermissions || null;
    }
  });
  expect(actualTypePermissions).to.not.equal(
    null,

    'TypePermissions not found in project'
  );

  expect(actualTypePermissions).to.deep.equal(
    typePermissions,
    'TypePermissions do not match'
  );
}

/**
 * Returns the module config of a project
 * @param name
 * @param moduleId
 * @returns {Promise<void>}
 */
async function getModuleConfig(
  name: string,
  moduleId: string
): Promise<ModuleConfig> {
  const config = await unpack(await getArchive(name));
  if (config.errors.length) {
    expect(config.errors.length).to.equal(
      0,

      `Error loading module config for project ${name}, ${moduleId}: ${config.errors[0].message}`
    );
  }
  const module = config.modules.find((module) => {
    return module.id === moduleId;
  });
  if (!module) {
    throw new Error(`Module ${moduleId} was not found in project`);
  }
  return module;
}
