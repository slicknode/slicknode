/**
 * Created by Ivo Meißner on 15.08.18
 *
 */
import { after, before, describe, it } from 'mocha';
import {
  executeQuery,
  executeWithTestContext,
  destroyTestContext,
  createTestUser,
} from '../../../test/utils';
import { tenantModules } from '../../index';
import { expect } from 'chai';
import { checkPassword } from '../../../auth/utils';
import { Role } from '../../../auth';

describe('auth listeners', () => {
  describe('encode password listener', () => {
    let context;

    before((done) => {
      executeWithTestContext(tenantModules, (c) => {
        context = c;
        done();
      });
    });

    after((done) => {
      destroyTestContext(context).then(() => done());
    });

    it('encodes the password for createUser mutation', async () => {
      // Create admin user to update user
      const user = await createTestUser([Role.ADMIN], context);
      const password = 'test12345XYZ';
      const result = await executeQuery(
        `mutation createUser($input: createUserInput!) {
        createUser(input: $input) {
          node {
            id
            firstName
            lastName
          }
        }
      }`,
        context,
        {
          input: {
            firstName: 'Max',
            lastName: 'Mustermann',
            password,
          },
        },
        {
          authContext: user.auth,
        }
      );
      expect(result.createUser.node.firstName).to.equal('Max');

      // Load entry from DB
      const storedUser = await context.db.User.find({
        id: context.fromGlobalId(result.createUser.node.id).id,
      });

      const passwordMatches = await checkPassword(
        password,
        storedUser.password
      );
      expect(passwordMatches).to.equal(true);
    });

    it('encodes the password for updateUser mutation', async () => {
      // Create admin user to update user
      const user = await createTestUser([Role.ADMIN], context);
      const password = 'test12345XYZ';
      const result = await executeQuery(
        `mutation updateUser($input: updateUserInput!) {
          updateUser(input: $input) {
            node {
              id
              firstName
              lastName
            }
          }
        }`,
        context,
        {
          input: {
            id: context.toGlobalId('User', user.user.id),
            firstName: 'Max',
            password,
          },
        },
        {
          authContext: user.auth,
        }
      );
      expect(result.updateUser.node.firstName).to.equal('Max');

      // Load entry from DB
      const storedUser = await context.db.User.find({
        id: context.fromGlobalId(result.updateUser.node.id).id,
      });

      const passwordMatches = await checkPassword(
        password,
        storedUser.password
      );
      expect(passwordMatches).to.equal(true);
    });
  });
});
