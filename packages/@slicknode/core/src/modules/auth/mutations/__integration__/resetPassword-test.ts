/**
 * Created by Ivo Meißner on 20.07.17.
 *
 */

import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import {
  executeWithTestContext,
  destroyTestContext,
} from '../../../../test/utils';
import { tenantModules } from '../../../index';
import chaiAsPromised from 'chai-as-promised';
import { hashPassword } from '../../../../auth/utils';
import { executeQuery } from '../../../../test/utils';
import { Role } from '../../../../auth';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

const TEST_EMAIL = 'mail@testemail.com';
const TEST_PASSWORD = 'validPassword1';

const createTokenMutation = `
mutation ($input: createPasswordResetTokenInput!) {
  createPasswordResetToken(input: $input) {
    resetToken
  }
}
`;

const resetPasswordMutation = `
mutation ($input: resetPasswordInput!) {
  resetPassword(input: $input) {
    accessToken
    accessTokenLifetime
    refreshToken
    refreshTokenLifetime
  }
}
`;

const emailLoginMutation = `
mutation ($input: loginEmailPasswordInput!) {
  loginEmailPassword(input: $input) {
    accessToken
    accessTokenLifetime
    refreshToken
    refreshTokenLifetime
  }
}
`;

describe('resetPassword Mutation', () => {
  let context;
  let user;

  before((done) => {
    executeWithTestContext(tenantModules, (c) => {
      context = c;

      // Create password hash
      hashPassword(TEST_PASSWORD).then((hash) => {
        context.db.User.create({
          email: TEST_EMAIL,
          password: hash,
          locale: c.locale,
        })
          .then((u) => {
            user = u;
            done();
          })
          .catch((error) => done(error));
      });
    });
  });

  after((done) => {
    destroyTestContext(context).then(() => done());
  });

  it('executes mutation successfully', (done) => {
    async function runTest() {
      const authContext = {
        uid: null,
        roles: [Role.RUNTIME, Role.ANONYMOUS],
        write: true,
      };
      context.auth = authContext;

      // Create reset token
      const response = await executeQuery(createTokenMutation, context, {
        input: {
          user: context.toGlobalId('User', user.id),
        },
      });
      const resetToken = response.createPasswordResetToken.resetToken;
      expect(resetToken.length).to.be.above(10);

      // Reset password with that token
      const password = '1234abcDEF';
      const resetResponse = await executeQuery(resetPasswordMutation, context, {
        input: {
          resetToken,
          password,
        },
      });

      let authTokenSet = resetResponse.resetPassword;
      expect(authTokenSet.accessToken.length).to.be.above(10);
      expect(authTokenSet.accessTokenLifetime).to.be.above(0);
      expect(authTokenSet.refreshToken.length).to.be.above(10);
      expect(authTokenSet.refreshTokenLifetime).to.be.above(0);

      // Check if we can login with new password
      const loginResult = await executeQuery(emailLoginMutation, context, {
        input: {
          email: TEST_EMAIL,
          password,
        },
      });

      authTokenSet = loginResult.loginEmailPassword;
      expect(authTokenSet.accessToken.length).to.be.above(10);
      expect(authTokenSet.accessTokenLifetime).to.be.above(0);
      expect(authTokenSet.refreshToken.length).to.be.above(10);
      expect(authTokenSet.refreshTokenLifetime).to.be.above(0);
    }
    runTest().then(done).catch(done);
  });

  it('can only generate token with app role', (done) => {
    async function runTest() {
      const authContext = {
        uid: null,
        roles: [Role.ADMIN, Role.ANONYMOUS],
        write: true,
      };
      context.auth = authContext;

      // Try to reset again with same token
      try {
        await executeQuery(createTokenMutation, context, {
          input: {
            user: context.toGlobalId('User', user.id),
          },
        });
        throw new Error('Mutation did not fail');
      } catch (e) {
        expect(e.message).to.contain(
          'You must be logged in to perform this action'
        );
      }
    }
    runTest().then(done).catch(done);
  });

  it('invalidates used reset token', (done) => {
    async function runTest() {
      const authContext = {
        uid: null,
        roles: [Role.RUNTIME, Role.ANONYMOUS],
        write: true,
      };
      context.auth = authContext;

      // Create reset token
      const response = await executeQuery(createTokenMutation, context, {
        input: {
          user: context.toGlobalId('User', user.id),
        },
      });
      const resetToken = response.createPasswordResetToken.resetToken;
      expect(resetToken.length).to.be.above(10);

      // Reset password with that token
      const password = '1234abcDEF';
      const resetResponse = await executeQuery(resetPasswordMutation, context, {
        input: {
          resetToken,
          password,
        },
      });

      const authTokenSet = resetResponse.resetPassword;
      expect(authTokenSet.accessToken.length).to.be.above(10);
      expect(authTokenSet.accessTokenLifetime).to.be.above(0);
      expect(authTokenSet.refreshToken.length).to.be.above(10);
      expect(authTokenSet.refreshTokenLifetime).to.be.above(0);

      // Try to reset again with same token
      try {
        await executeQuery(resetPasswordMutation, context, {
          input: {
            resetToken,
            password,
          },
        });
        throw new Error('Mutation did not fail');
      } catch (e) {
        expect(e.message).to.contain('mutations.resetPassword.failure:');
      }
    }
    runTest().then(done).catch(done);
  });

  it('validates reset secret', (done) => {
    async function runTest() {
      const authContext = {
        uid: null,
        roles: [Role.RUNTIME, Role.ANONYMOUS],
        write: true,
      };
      context.auth = authContext;

      // Reset password with that token
      const password = '1234abcDEF';
      try {
        await executeQuery(resetPasswordMutation, context, {
          input: {
            resetToken: 'Mjo6OktqNDcwWjVadElWbk9iQmJFbkBBcytZK0poT3EqITd4', // Invalid reset token
            password,
          },
        });
        throw new Error('Mutation does not fail');
      } catch (e) {
        expect(e.message).to.contain('mutations.resetPassword.failure:');
      }
    }
    runTest().then(done).catch(done);
  });
});
