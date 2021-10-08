/**
 * Created by Ivo Meißner on 05.05.17.
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
import {
  hashPassword,
  generateAuthTokenSet,
  AUTH_REFRESH_COOKIE_NAME,
  getRefreshTokenId,
} from '../../../../auth/utils';
import { executeQuery } from '../../../../test/utils';
import { AUTH_DEFAULT_REFRESH_TOKEN_LIFETIME } from '../../../../config';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

const TEST_EMAIL = 'mail@testemail.com';
const TEST_PASSWORD = 'validPassword1';

const refreshTokenMutationQuery = `
mutation ($input: refreshAuthTokenInput!) {
  refreshAuthToken(input: $input) {
    accessToken
    accessTokenLifetime
    refreshToken
    refreshTokenLifetime
  }
}
`;

const logoutMutationQuery = `
mutation ($input: logoutUserInput!) {
  logoutUser(input: $input) {
    success
  }
}
`;

describe('refreshAuthToken Mutation', () => {
  let context;
  let user;

  before(function (done) {
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
    destroyTestContext(context)
      .then(() => done())
      .catch(done);
  });

  it('executes mutation successfully', function (done) {
    async function runTest() {
      const tokenSet = await generateAuthTokenSet({
        user,
        context,
        moduleId: 'auth',
      });

      const input = {
        refreshToken: tokenSet.refreshToken,
      };

      const result = await executeQuery(refreshTokenMutationQuery, context, {
        input,
      });
      const response = result.refreshAuthToken;

      expect(response.refreshToken).to.not.be.null;
      expect(response.accessToken).to.not.be.null;
      expect(response.refreshTokenLifetime).to.not.be.null;
      expect(response.refreshTokenLifetime).to.be.above(0);
      expect(response.accessTokenLifetime).to.not.be.null;
      expect(response.accessTokenLifetime).to.be.above(0);
    }
    runTest().then(done).catch(done);
  });

  it('can only use every token once', (done) => {
    async function runTest() {
      const tokenSet = await generateAuthTokenSet({
        user,
        context,
        moduleId: 'auth',
      });

      const input = {
        refreshToken: tokenSet.refreshToken,
      };

      const result = await executeQuery(refreshTokenMutationQuery, context, {
        input,
      });
      const response = result.refreshAuthToken;

      expect(response.refreshToken).to.not.be.null;
      expect(response.accessToken).to.not.be.null;
      expect(response.refreshTokenLifetime).to.not.be.null;
      expect(response.refreshTokenLifetime).to.be.above(0);
      expect(response.accessTokenLifetime).to.not.be.null;
      expect(response.accessTokenLifetime).to.be.above(0);

      try {
        await executeQuery(refreshTokenMutationQuery, context, { input });
        throw new Error('Did not fail for reused refresh token');
      } catch (e) {
        expect(
          e.message.startsWith('mutations.refreshAuthToken.failure')
        ).to.equal(true);
      }
    }
    runTest().then(done).catch(done);
  });

  it('fails for invalid token', (done) => {
    async function runTest() {
      const tokenSet = await generateAuthTokenSet({
        user,
        context,
        moduleId: 'auth',
      });

      const input = {
        refreshToken: tokenSet.refreshToken + 'inv',
      };

      try {
        await executeQuery(refreshTokenMutationQuery, context, { input });
        throw new Error('Did not fail for invalid token');
      } catch (e) {
        expect(
          e.message.startsWith('mutations.refreshAuthToken.failure')
        ).to.equal(true);
      }
    }
    runTest().then(done).catch(done);
  });

  it('cannot refresh token that has been logged out', (done) => {
    async function runTest() {
      const tokenSet = await generateAuthTokenSet({
        user,
        context,
        moduleId: 'auth',
      });

      const input = {
        refreshToken: tokenSet.refreshToken,
      };

      await executeQuery(logoutMutationQuery, context, { input });

      try {
        await executeQuery(refreshTokenMutationQuery, context, { input });
        throw new Error('Did not fail for token that has been logged out');
      } catch (e) {
        expect(
          e.message.startsWith('mutations.refreshAuthToken.failure')
        ).to.equal(true);
      }
    }
    runTest().then(done).catch(done);
  });

  it('sets refresh token in cookie', async () => {
    const tokenSet = await generateAuthTokenSet({
      user,
      context,
      moduleId: 'auth',
    });

    // Check is set in cookie
    expect(context.res.cookies[AUTH_REFRESH_COOKIE_NAME].options).to.deep.equal(
      {
        maxAge: AUTH_DEFAULT_REFRESH_TOKEN_LIFETIME * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      }
    );
    const refreshTokenId = getRefreshTokenId(
      context.res.cookies[AUTH_REFRESH_COOKIE_NAME].value,
      context
    );

    // Check if refresh token is stored to DB
    const refreshToken = await context.db.RefreshToken.find({
      id: refreshTokenId,
    });
    expect(refreshToken).to.not.null;

    // Set request cookie
    context.req.cookies[AUTH_REFRESH_COOKIE_NAME] =
      context.res.cookies[AUTH_REFRESH_COOKIE_NAME].value;
    await executeQuery(logoutMutationQuery, context, { input: {} });

    // Refresh token was deleted
    const refreshTokenAfter = await context.db.RefreshToken.find({
      id: refreshTokenId,
    });
    expect(refreshTokenAfter).to.null;

    // Refresh cookie is deleted
    expect(context.res.cookies[AUTH_REFRESH_COOKIE_NAME].value).to.equal('');
  });
});
