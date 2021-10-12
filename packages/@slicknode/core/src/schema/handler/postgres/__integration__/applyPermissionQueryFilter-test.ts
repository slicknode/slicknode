/**
 * Created by Ivo Meißner on 23.01.19
 *
 */
import { expect } from 'chai';
import { describe, it } from 'mocha';
import {
  buildModules,
  createTestContext,
  createTestUser,
  destroyTestContext,
  executeQuery,
} from '../../../../test/utils';
import { ModuleConfig } from '../../../../definition';
import path from 'path';
import { Role } from '../../../../auth';

/* eslint-disable no-unused-expressions */

describe('Postgres applyPermissionQueryFilter', () => {
  it('applies permissions with recursive path', async () => {
    const context = await createTestContext(
      await getModules('permissions-recursive-path')
    );

    // Can perform basic read operations
    // const result = await executeQuery(query, context);
    // expect(result.create.node.id).to.be.string;

    const otherUser = await createTestUser([Role.AUTHENTICATED], context);
    const account = await context.db.Account_Account.create({
      name: 'test',
    });

    const query = `query UserSelectQuery($accountId: ID!) {
  users: listUser(filter: {node: {Account_accounts: {node: {id: {eq: $accountId}}}}}) {
    edges {
      node {
        ...UserSelectItem
        __typename
      }
      __typename
    }
    __typename
  }
}

fragment UserSelectItem on User {
  id
  firstName
  lastName
  __typename
}
`;
    const result = await executeQuery(
      query,
      context,
      {
        accountId: context.toGlobalId('Account_Account', account.id),
      },
      { authContext: otherUser.auth }
    );
    expect(result).to.not.equal(null);

    await destroyTestContext(context);
  });

  describe('ContentNode permission filters', () => {
    it('applies permission filter with correct role but wrong node filter', async () => {
      const context = await createTestContext(
        await getModules('content-node-permissions')
      );

      const staff = await createTestUser([Role.STAFF], context);
      const user = await createTestUser([Role.AUTHENTICATED], context);

      const createUserMutation = `
        mutation M($input: Test_createUserInput!) {
          Test_createUser(input: $input) {
            node {
              id
              name
              contentNode {id}
            }
          }
        }
      `;
      try {
        await executeQuery(
          createUserMutation,
          context,
          {
            input: {
              name: 'User1',
              user: context.toGlobalId('User', user.user.id),
            },
          },
          { authContext: staff.auth }
        );
        throw new Error('Does not fail');
      } catch (e) {
        expect(e.message).to.include(
          "You don't have permission to perform this action"
        );
      }
    });

    it('applies permission filter with correct role + node filter', async () => {
      const context = await createTestContext(
        await getModules('content-node-permissions')
      );

      const staff = await createTestUser([Role.STAFF], context);

      const createUserMutation = `
        mutation M($input: Test_createUserInput!) {
          createUser: Test_createUser(input: $input) {
            node {
              id
              name
              contentNode {id}
            }
          }
        }
      `;
      const result = await executeQuery(
        createUserMutation,
        context,
        {
          input: {
            name: 'User1',
            user: context.toGlobalId('User', staff.user.id),
          },
        },
        { authContext: staff.auth }
      );
      expect(result.createUser.node.name).to.equal('User1');
    });

    it('applies permission filter with correct role + node filter publish mutation', async () => {
      const context = await createTestContext(
        await getModules('content-node-permissions')
      );

      const staff = await createTestUser([Role.STAFF], context);

      const createUserMutation = `
        mutation M($input: Test_createUserInput!) {
          createUser: Test_createUser(input: $input) {
            node {
              id
              name
              contentNode {id}
            }
          }
        }
      `;
      let result = await executeQuery(
        createUserMutation,
        context,
        {
          input: {
            name: 'User1',
            user: context.toGlobalId('User', staff.user.id),
          },
        },
        { authContext: staff.auth }
      );
      expect(result.createUser.node.name).to.equal('User1');

      const publishUserMutation = `
        mutation M($input: Test_publishUserInput!) {
          publishUser: Test_publishUser(input: $input) {
            nodes {
              id
              name
              contentNode {id}
            }
          }
        }
      `;
      result = await executeQuery(
        publishUserMutation,
        context,
        {
          input: {
            ids: [result.createUser.node.id],
            status: 'PUBLISHED',
          },
        },
        { authContext: staff.auth }
      );
      expect(result.publishUser.nodes[0].name).to.equal('User1');
    });

    it('throws error for missing role', async () => {
      const context = await createTestContext(
        await getModules('content-node-permissions')
      );

      const user = await createTestUser([Role.AUTHENTICATED], context);

      const createUserMutation = `
        mutation M($input: Test_createUserInput!) {
          Test_createUser(input: $input) {
            node {
              id
              name
              contentNode {id}
            }
          }
        }
      `;
      try {
        await executeQuery(
          createUserMutation,
          context,
          {
            input: {
              name: 'User1',
              user: context.toGlobalId('User', user.user.id),
            },
          },
          { authContext: user.auth }
        );
        throw new Error('Does not fail');
      } catch (e) {
        expect(e.message).to.include(
          "You don't have permission to perform this action"
        );
      }
    });
  });
});

async function getModules(name: string): Promise<Array<ModuleConfig>> {
  return await buildModules(path.join(__dirname, 'testprojects', name));
}
