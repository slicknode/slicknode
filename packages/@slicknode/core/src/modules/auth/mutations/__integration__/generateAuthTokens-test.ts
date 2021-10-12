/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

/* eslint-disable no-unused-expressions */

import { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import {
  executeWithTestContext,
  destroyTestContext,
  createTestUser,
  executeQuery,
} from '../../../../test/utils';
import { tenantModules } from '../../../index';
import { Role } from '../../../../auth';

const GENERATE_AUTH_TOKEN_MUTATION = `mutation ($input: generateAuthTokensInput!) {
  generateAuthTokens(input: $input) {
    accessToken
    accessTokenLifetime
    refreshToken
    refreshTokenLifetime
  }
}`;

describe('generateAuthTokens Mutation', () => {
  let context;
  let user;
  before((done) => {
    executeWithTestContext(tenantModules, (c) => {
      context = c;
      createTestUser([Role.AUTHENTICATED, Role.RUNTIME], context).then((u) => {
        user = u;
        if (u.auth) {
          context.auth = u.auth;
        }
        done();
      });
    });
  });

  after((done) => {
    destroyTestContext(context).then(() => done());
  });

  it('executes mutation successfully', async () => {
    const input = {
      user: context.toGlobalId('User', user.user.id),
      module: 'auth',
    };

    const response = (
      await executeQuery(GENERATE_AUTH_TOKEN_MUTATION, context, {
        input,
      })
    ).generateAuthTokens;

    expect(response.refreshToken).to.not.be.null;
    expect(response.refreshTokenLifetime).to.not.be.null;
    expect(response.refreshTokenLifetime).to.be.above(0);
    expect(response.accessToken).to.not.be.null;
    expect(response.accessTokenLifetime).to.not.be.null;
    expect(response.accessTokenLifetime).to.be.above(0);
  });

  it('throws error for invalid module name', async () => {
    const input = {
      user: context.toGlobalId('User', user.user.id),
      module: 'invalid-module-id',
    };

    try {
      await executeQuery(GENERATE_AUTH_TOKEN_MUTATION, context, {
        input,
      });
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.contain('The token could not be generated');
    }
  });

  it('throws error for invalid user id', async () => {
    const input = {
      user: context.toGlobalId('User', 23458376458),
      module: 'core',
    };

    try {
      await executeQuery(GENERATE_AUTH_TOKEN_MUTATION, context, {
        input,
      });
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.contain('The token could not be generated');
    }
  });

  it('throws error for invalid user id format', async () => {
    const input = {
      user: context.toGlobalId('User', '"&%$§%'),
      module: 'core',
    };

    try {
      await executeQuery(GENERATE_AUTH_TOKEN_MUTATION, context, {
        input,
      });
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.contain(
        'The provided input values could not be validated. Please check the values.'
      );
    }
  });

  it('fails for missing RUNTIME role', async () => {
    const input = {
      user: context.toGlobalId('User', '"&%$§%'),
      module: 'core',
    };

    try {
      await executeQuery(
        GENERATE_AUTH_TOKEN_MUTATION,
        context,
        {
          input,
        },
        {
          authContext: {
            ...context.auth,
            roles: Role.AUTHENTICATED,
          },
        }
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.contain(
        "You don't have permission to perform this action"
      );
    }
  });

  it('fails for anonymous user', async () => {
    const input = {
      user: context.toGlobalId('User', '"&%$§%'),
      module: 'core',
    };

    try {
      await executeQuery(
        GENERATE_AUTH_TOKEN_MUTATION,
        context,
        {
          input,
        },
        {
          authContext: {
            uid: null,
            write: true,
            roles: [Role.ANONYMOUS],
          },
        }
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.contain(
        'You must be logged in to perform this action'
      );
    }
  });
});
