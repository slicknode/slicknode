/**
 * Created by Ivo Meißner on 19.07.17.
 *
 */

import chai, { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import {
  destroyTestContext,
  executeQuery,
  executeWithTestContext,
} from '../../test/utils';
import schemaConfig from './permissionQueryTestSchemaConfig';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import { AuthContext, Role } from '../type';
import Context from '../../context';
import * as uuid from 'uuid';
import { ErrorCode } from '../../errors';

chai.use(chaiAsPromised);

const createUserQuery = `mutation CreateUserQuery($input: createUserInput!){
  result: createUser(input: $input) {
    node {
      __typename
    }
  }
}`;

const deleteUserQuery = `mutation DeleteUserQuery($input: deleteUserInput!) {
  result: deleteUser(input: $input) {
    node {
      __typename
    }
  }
}`;

const updateUserQuery = `mutation UpdateUserQuery($input: updateUserInput!) {
  result: updateUser(input: $input) {
    node {
      __typename
    }
  }
}`;

/**
 * Returns promise that resolves to true if the access on the query with the given input values
 * was denied
 *
 * @param query
 * @param input
 * @param authContext
 * @param context
 * @returns {Promise.<void>}
 */
async function assertAccessDenied(
  query: string,
  input: {
    [x: string]: any;
  },
  authContext: AuthContext,
  context: Context
) {
  try {
    context.auth = authContext;
    await executeQuery(query, context, { input });
    throw new Error('Mutation successful for query: ' + query);
  } catch (e) {
    if (
      e.message.startsWith('Mutation successful for query: ') ||
      !e.originalError ||
      ![ErrorCode.ACCESS_DENIED, ErrorCode.LOGIN_REQUIRED].includes(
        e.originalError.code
      )
    ) {
      throw e;
    }
  }
}

/**
 * Returns promise that resolves to true if the access on the query with the given input values
 * was denied
 *
 * @param query
 * @param input
 * @param authContext
 * @param context
 * @returns {Promise.<void>}
 */
async function assertAccessGranted(
  query: string,
  input: {
    [x: string]: any;
  },
  authContext: AuthContext,
  context: Context
) {
  context.auth = authContext;
  const result = await executeQuery(query, context, { input });
  expect(typeof result).to.equal('object');
}

describe('Permission Query:', () => {
  let context = null;
  const userIds = [];
  before((done) => {
    executeWithTestContext(schemaConfig, (c) => {
      async function populateTestData() {
        // Create groups
        const groupPromises = _.range(101).map((index) => {
          return c.db.Group.create({
            id: index + 1,
            name: `name${index}`,
          });
        });
        const groups = [];
        for (let j = 0; j < groupPromises.length; j++) {
          const tmpGroup = await groupPromises[j];
          groups.push(tmpGroup);
        }

        // Create users
        const userPromises = _.range(10).map((index) => {
          const values: {
            [x: string]: any;
          } = {
            // id: index + 1,
            name: `name${index}`,
            nameOrder: `nameOrder${index % 3}`,
            intField: index,
            intOrderField: index % 3,
            floatField: 1000 + index,
            floatOrderField: (index % 3) / 10,
            even: index === 0 ? null : index % 2 === 0,
            dateTimeField: String(2000 + index) + '-01-01T00:00:00Z',
            dateTimeOrderField: String(2000 + (index % 3)) + '-01-01T00:00:00Z',
            group: groups[0].id,
            userType: null,
          };
          switch (index % 4) {
            case 0:
              values.userType = 'ADMIN';
              break;
            case 1:
              values.userType = 'STAFF';
              break;
            case 2:
              values.userType = 'USER';
              break;
          }
          return c.db.User.create(values);
        });
        const users = [];
        for (let i = 0; i < userPromises.length; i++) {
          const tmpUser = await userPromises[i];
          users.push(tmpUser);
        }

        const results = [...users, ...groups];

        // Add memberships
        const memberships = [];
        _.range(0, 10).forEach((userIndex) => {
          userIds.push(c.toGlobalId('User', results[userIndex].id));
          _.range(10, 101).forEach((groupIndex, memberId) => {
            memberships.push(
              c.db.Membership.create({
                id: userIndex * 1000 + groupIndex,
                user: results[userIndex].id,
                group: results[groupIndex].id,
                memberId: 'member' + memberId,
              })
            );
          });
        });
        // Execute mutations sequentially
        for (let k = 0; k < memberships.length; k++) {
          await memberships[k];
        }
      }
      context = c;
      populateTestData().then(done).catch(done);
    });
  });

  after((done) => {
    destroyTestContext(context)
      .then(() => done())
      .catch(done);
  });

  describe('Node create', () => {
    it('can create node with limited field access', (done) => {
      assertAccessGranted(
        createUserQuery,
        {
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
        },
        {
          uid: null,
          roles: [Role.ANONYMOUS],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot create node with input on not allowed fields', (done) => {
      assertAccessDenied(
        createUserQuery,
        {
          name: 'testUser',
          even: true,
          email: uuid.v1() + '@domain.com',
        },
        {
          uid: null,
          roles: [Role.ANONYMOUS],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('can create node with role that has full access', (done) => {
      assertAccessGranted(
        createUserQuery,
        {
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
          even: false,
        },
        {
          uid: null,
          roles: [Role.ADMIN],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('can create node with role that has full access plus one that should be denied', (done) => {
      assertAccessGranted(
        createUserQuery,
        {
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
          even: false,
        },
        {
          uid: null,
          roles: [Role.ADMIN, Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot create node with role that has no permissions', (done) => {
      assertAccessDenied(
        createUserQuery,
        {
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
          even: false,
        },
        {
          uid: null,
          roles: [Role.FULLY_AUTHENTICATED],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });
  });

  describe('Node update', () => {
    it('can update node with role that has full access', (done) => {
      assertAccessGranted(
        updateUserQuery,
        {
          id: userIds[0],
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
          even: false,
        },
        {
          uid: null,
          roles: [Role.ADMIN],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    /*
    // @TODO: Access for user self edit was removed. Write test case where permission
    // was granted vie permission query extension in other module
    it('can update node with role that has access on specific node', done => {
      assertAccessGranted(updateUserQuery, {
        id: userIds[1],
        name: 'testUser'
      }, {
        uid: context.fromGlobalId(userIds[1]).id,
        roles: [ Role.AUTHENTICATED ],
        write: true
      }, context).then(done).catch(done);
    });
    */

    it('cannot update node with role that has no access on specific node', (done) => {
      assertAccessDenied(
        updateUserQuery,
        {
          id: userIds[1],
          name: 'testUser',
        },
        {
          uid: '3',
          roles: [Role.AUTHENTICATED],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot update node with role that has access on specific node with not enough fields', (done) => {
      assertAccessDenied(
        updateUserQuery,
        {
          id: userIds[1],
          name: 'testUser',
          email: uuid.v1() + '@domain.com',
          even: false,
        },
        {
          uid: context.fromGlobalId(userIds[1]).id,
          roles: [Role.AUTHENTICATED],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('can update node with role that has matching filters', (done) => {
      assertAccessGranted(
        updateUserQuery,
        {
          id: userIds[2],
          name: 'testUser',
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot update node with role that has no matching filters', (done) => {
      assertAccessDenied(
        updateUserQuery,
        {
          id: userIds[3],
          name: 'testUser',
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot update node where previously matching filter does not match after update', (done) => {
      assertAccessDenied(
        updateUserQuery,
        {
          id: userIds[8],
          name: 'testUser',
          even: false,
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot update node that has no matching filter that would match after update', (done) => {
      assertAccessDenied(
        updateUserQuery,
        {
          id: userIds[7],
          name: 'testUser',
          even: true,
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });
  });

  describe('Node delete', () => {
    it('can delete node with role that has full access', (done) => {
      assertAccessGranted(
        deleteUserQuery,
        {
          id: userIds[0],
        },
        {
          uid: null,
          roles: [Role.ADMIN],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot delete node with role that has no access', (done) => {
      assertAccessDenied(
        deleteUserQuery,
        {
          id: userIds[1],
        },
        {
          uid: null,
          roles: [Role.ANONYMOUS],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot delete node with role that has access but no matching filter', (done) => {
      assertAccessDenied(
        deleteUserQuery,
        {
          id: userIds[3],
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('can delete node with role that has access with matching filter', (done) => {
      assertAccessGranted(
        deleteUserQuery,
        {
          id: userIds[4],
        },
        {
          uid: null,
          roles: [Role.STAFF],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('can delete node with role that has access on specific node', (done) => {
      assertAccessGranted(
        deleteUserQuery,
        {
          id: userIds[5],
        },
        {
          uid: context.fromGlobalId(userIds[5]).id,
          roles: [Role.AUTHENTICATED],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });

    it('cannot delete node with no roles', (done) => {
      assertAccessDenied(
        deleteUserQuery,
        {
          id: userIds[6],
        },
        {
          uid: null,
          roles: [],
          write: true,
        },
        context
      )
        .then(done)
        .catch(done);
    });
  });
});
