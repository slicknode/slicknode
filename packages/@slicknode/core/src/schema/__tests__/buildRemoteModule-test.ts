/**
 * Created by Ivo Meißner on 2019-07-04
 *
 */
import SchemaBuilder from '../builder';
import remoteSchemaConfig from './schemaConfigs/remoteSchemaConfig';
import shopifySchemaConfig from './schemaConfigs/shopifyTestConfig';
import { assertObjectType, printSchema } from 'graphql';
import { expect } from 'chai';
import {
  createContextMock,
  executeQuery,
  mockGraphqlApi,
} from '../../test/utils';
import sinon from 'sinon';
import { ModuleConfig } from '../../definition';
import { formatError } from '../../errors';

/* eslint-disable camelcase */

function assertSchema(
  description: string,
  expected: string,
  modules: ModuleConfig[] = remoteSchemaConfig
) {
  it(description, () => {
    const schemaBuilder = new SchemaBuilder({ modules });
    const schema = schemaBuilder.getSchema();
    const schemaSdl = printSchema(schema);
    expect(schemaSdl).to.contain(expected);
  });
}

describe('SchemaBuilder', () => {
  describe('Remote module', () => {
    assertSchema(
      'initializes shopify schema successfully',
      'type Test_CheckoutAttributesUpdateV2Payload {',
      shopifySchemaConfig
    );

    assertSchema('creates object types', 'type Test_Post {');

    assertSchema(
      'creates fields with multi dimensional lists',
      'multiDimensionalList: [[[ID!]]!]'
    );

    assertSchema('adds field input args', 'postInputArgs(url: [[String!]])');

    assertSchema('adds nullable array field', 'nullableArray: [Test_Post]');

    assertSchema(
      'adds field deprecations',
      'deprecatedField: String @deprecated(reason: "Obsolete")'
    );

    assertSchema(
      'adds type field descriptions',
      '"""Type field descriptions"""'
    );

    assertSchema('adds interface types', 'interface Test_TestInterface {');

    assertSchema(
      'adds types with multiple interfaces',
      'type Test_MultiInterfaceType implements Test_TestInterface & Test_Interface2 {'
    );

    assertSchema(
      'adds interface field descriptions',
      '"""TestInterface iField description"""'
    );

    assertSchema(
      'adds union types',
      'union Test_UnionType = Test_UnionA | Test_UnionB'
    );

    assertSchema('adds union type description', '"""Union type description"""');

    assertSchema('creates input types', 'input Test_MutationInput {');

    assertSchema('creates enum types', 'enum Test_Enum1 {');

    assertSchema(
      'adds enum value descriptions',
      '"""Enum Value Description"""'
    );

    assertSchema('adds custom scalar', 'scalar Test_DateTime');

    assertSchema('adds root query fields', 'Test_posts(limit: Int): Test_Post');

    assertSchema(
      'creates mutation',
      'Test_createPost(title: String!): Test_Post\n'
    );

    it('executes simple GraphQL query on remote endpoint', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          Test_posts {
            title
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi(
        {
          endpoint: 'http://localhost/',
          variables,
          query: `{
          posts {
            title
          }
        }`,
        },
        {
          data: {
            posts: {
              title: 'Test title',
            },
          },
        }
      );
      const result = await executeQuery(query, context, variables);
      mock.done();
      expect(result).to.deep.equal({
        viewer: {
          roles: ['ANONYMOUS'],
        },
        Test_posts: {
          title: 'Test title',
        },
      });
    });

    it('executes GraphQL query with alias on remote endpoint', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          Test_posts {
            test: title
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi(
        {
          endpoint: 'http://localhost/',
          variables,
          query: `{
          posts {
            test: title
          }
        }`,
          headers: {
            some: 'header',
            'with-variable': 'Original',
          },
        },
        {
          data: {
            posts: {
              test: 'Test title',
            },
          },
        }
      );
      const result = await executeQuery(query, context, variables);
      mock.done();
      expect(result).to.deep.equal({
        viewer: {
          roles: ['ANONYMOUS'],
        },
        Test_posts: {
          test: 'Test title',
        },
      });
    });

    it('handles GraphQL API failure gracefully', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          Test_posts {
            test: title
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi({
        endpoint: 'http://localhost/',
        variables,
        query: `{
          posts {
            test: title
          }
        }`,
      }).reply(404);
      try {
        const result = await executeQuery(query, context, variables);
        expect(result).to.deep.equal({
          viewer: {
            roles: ['ANONYMOUS'],
          },
          Test_posts: {
            test: 'Test title',
          },
        });
        throw new Error('Does not throw GraphQL error');
      } catch (e) {
        expect(e.message).to.contain(
          'Error loading data from remote GraphQL API'
        );
      }
      mock.done();
    });

    it('passes remote GraphQL errors to response', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          Test_posts {
            test: title
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi(
        {
          endpoint: 'http://localhost/',
          variables,
          query: `{
          posts {
            test: title
          }
        }`,
          headers: {
            some: 'header',
            'with-variable': 'Original',
          },
        },
        {
          data: null,
          errors: [
            { message: 'Some other error occured' },
            { message: 'Some error occured' },
          ],
        }
      );
      try {
        const result = await executeQuery(query, context, variables);
        expect(result).to.deep.equal({
          viewer: {
            roles: ['ANONYMOUS'],
          },
          Test_posts: {
            test: 'Test title',
          },
        });
      } catch (e) {
        expect(formatError(e)).to.deep.equal({
          message: 'Some other error occured\nSome error occured',
          locations: [{ line: 6, column: 11 }],
          path: ['Test_posts'],
          extensions: { code: 'REMOTE_API_ERROR' },
        });
      } finally {
        mock.done();
      }
    });

    it('executes GraphQL query with typeExtensions on remote type', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          Test_posts {
            title
            authorName
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi(
        {
          endpoint: 'http://localhost/',
          variables,
          query: `{
          posts {
            title
          }
        }`,
        },
        {
          data: {
            posts: {
              title: 'Test title',
            },
          },
        }
      );
      const result = await executeQuery(query, context, variables);
      mock.done();
      expect(result).to.deep.equal({
        viewer: {
          roles: ['ANONYMOUS'],
        },
        Test_posts: {
          title: 'Test title',
          authorName: 'John Doe',
        },
      });
    });

    it('executes GraphQL query with connections on remote type', async () => {
      const context = createContextMock(remoteSchemaConfig);
      const query = `
        {
          viewer {
            roles
          }
          ...on Query {
            Test_posts {
              comments {
                totalCount
              }
            }
          }
          Test_posts {
            title
            ...on Test_Post {
              title
              comments {
                totalCount
              }
            }
            comments {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      `;
      const variables = {};
      const mock = mockGraphqlApi(
        {
          endpoint: 'http://localhost/',
          variables,
          query: `{
          posts {
            title
            ... on Post {
              title
              ... on Post {
                id
              }
            }
            ... on Post {
              id
            }
            ... on Post {
              id
            }
          }
        }`,
        },
        {
          data: {
            posts: {
              title: 'Test title',
              id: '43',
            },
          },
        }
      );

      // Mock resolver of connection
      const stub = sinon.stub().returns({
        edges: [{ node: { id: 234, text: 'comment' } }],
      });
      const field = assertObjectType(
        context.schemaBuilder.getSchema().getType('Test_Post')
      ).getFields()['comments'];
      sinon.stub(field, 'resolve' as any).callsFake(stub);

      const result = await executeQuery(query, context, variables);
      mock.done();

      expect(stub.calledOnce).to.equal(true);
      expect(stub.firstCall.args[0].id).to.equal('43');

      expect(result).to.deep.equal({
        viewer: {
          roles: ['ANONYMOUS'],
        },
        Test_posts: {
          comments: {
            totalCount: null,
            edges: [
              {
                node: {
                  id: '234',
                },
              },
            ],
          },
          title: 'Test title',
        },
      });
    });
  });
});
