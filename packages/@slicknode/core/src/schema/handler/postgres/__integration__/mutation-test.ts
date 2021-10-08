import { ModuleConfig } from '../../../../definition';
import {
  buildModules,
  createTestContext,
  executeQuery,
} from '../../../../test/utils';
import path from 'path';
import { expect } from 'chai';
import { describe, it } from 'mocha';

describe('PostgresHandler mutations', () => {
  it('updates lastUpdatedAt field for TimeStampedInterface', async () => {
    const context = await createTestContext(
      await getModules('time-stamped-interface-1')
    );
    const query = `mutation {
      post: Test_createPost(input: {text: "Test"}) {
        node {
          id
          text
          lastUpdatedAt
          createdAt
        }
      }
    }`;

    const result = await executeQuery(query, context);
    let post = result.post.node;
    expect(post.lastUpdatedAt).to.equal(null);
    expect(post.text).to.equal('Test');

    const updateResult = await executeQuery(
      `
      mutation M($input: Test_updatePostInput!) {
        post: Test_updatePost(input: $input) {
          node {
            id
            text
            lastUpdatedAt
            createdAt
          }
        }
      }
    `,
      context,
      {
        input: {
          id: result.post.node.id,
          text: 'updated',
        },
      }
    );
    post = updateResult.post.node;
    expect(post.lastUpdatedAt).to.not.equal(null);
    expect(post.text).to.equal('updated');
  });

  it('can perform CRUD operations on type with 200 fields', async () => {
    const context = await createTestContext(
      await getModules('object-type-large')
    );
    const query = `mutation {
      post: Test_createTest(input: {field1: "Test"}) {
        node {
          id
          field1
          field2
        }
      }
    }`;

    const result = await executeQuery(query, context);
    let post = result.post.node;
    expect(post.field1).to.equal('Test');

    const updateResult = await executeQuery(
      `
      mutation M($input: Test_updateTestInput!) {
        post: Test_updateTest(input: $input) {
          node {
            id
            field1
          }
        }
      }
    `,
      context,
      {
        input: {
          id: result.post.node.id,
          field1: 'updated',
        },
      }
    );
    post = updateResult.post.node;
    expect(post.field1).to.equal('updated');
  });
});

async function getModules(name: string): Promise<Array<ModuleConfig>> {
  return await buildModules(path.join(__dirname, 'testprojects', name));
}
