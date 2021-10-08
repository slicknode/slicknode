/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import {
  executeWithTestContext,
  destroyTestContext,
} from '../../../../test/utils';
import { tenantModules } from '../../../index';
import loginEmailPassword from '../loginEmailPassword';
import chaiAsPromised from 'chai-as-promised';
import { hashPassword } from '../../../../auth/utils';
import { GraphQLResolveInfo } from 'graphql';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

const TEST_EMAIL = 'mail@testemail.com';
const TEST_PASSWORD = 'validPassword1';

describe('loginEmailPassword Mutation', () => {
  let context = null;
  before((done) => {
    executeWithTestContext(tenantModules, (c) => {
      context = c;
      // Create password hash
      hashPassword(TEST_PASSWORD).then((hash) => {
        // Store in DB
        context.db.User.create({
          email: TEST_EMAIL,
          password: hash,
          locale: c.locale,
        })
          .then(() => {
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
    const input = {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    };

    const result = loginEmailPassword.mutate(
      input,
      context,
      {} as GraphQLResolveInfo
    );

    result
      .then((response) => {
        expect(response.user.email).to.equal(input.email);
        expect(response.user.id).to.not.be.null;
        expect(response.refreshToken).to.not.be.null;
        expect(response.refreshTokenLifetime).to.not.be.null;
        expect(response.refreshTokenLifetime).to.be.above(0);
        expect(response.accessToken).to.not.be.null;
        expect(response.accessTokenLifetime).to.not.be.null;
        expect(response.accessTokenLifetime).to.be.above(0);
        done();
      })
      .catch((error) => {
        done(error);
      });
  });

  it('fails with invalid password', (done) => {
    const input = {
      email: TEST_EMAIL,
      password: 'invalidPW',
    };

    const result = loginEmailPassword.mutate(
      input,
      context,
      {} as GraphQLResolveInfo
    );

    result
      .then((response) => {
        expect(response.user.email).to.equal(input.email);
        expect(response.user.id).to.not.be.null;
        expect(response.refreshToken).to.not.be.null;
        expect(response.accessToken).to.not.be.null;
        done('Mutation did not fail with invalid password');
      })
      .catch((e) => {
        expect(e.message).to.contain(
          'Invalid email address and password combination'
        );
        done();
      });
  });

  it('fails with empty password', (done) => {
    const input = {
      email: TEST_EMAIL,
      password: null,
    };

    const result = loginEmailPassword.mutate(
      input,
      context,
      {} as GraphQLResolveInfo
    );

    result
      .then((response) => {
        expect(response.user.email).to.equal(input.email);
        expect(response.user.id).to.not.be.null;
        expect(response.refreshToken).to.not.be.null;
        expect(response.accessToken).to.not.be.null;
        done('Mutation did not fail with empty password');
      })
      .catch((e) => {
        expect(e.message).to.contain(
          'Invalid email address and password combination'
        );
        done();
      });
  });

  it('fails for user without configured password', async () => {
    // Create test user
    const email = 'no-password-user@example.com';
    const user = await context.db.User.create({
      email,
    });

    const input = {
      email,
      password: 'sefdrg',
    };
    expect(user.id).to.not.equal(null);

    try {
      const result = await loginEmailPassword.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );
      throw new Error('Mutation did not fail');
    } catch (e) {
      expect(e.message).to.contain(
        'Invalid email address and password combination'
      );
    }
  });

  it('fails with invalid email', (done) => {
    const input = {
      email: 'inv' + TEST_EMAIL,
      password: null,
    };

    const result = loginEmailPassword.mutate(
      input,
      context,
      {} as GraphQLResolveInfo
    );

    result
      .then((response) => {
        expect(response.user.email).to.equal(input.email);
        expect(response.user.id).to.not.be.null;
        expect(response.refreshToken).to.not.be.null;
        expect(response.accessToken).to.not.be.null;
        done('Mutation did not fail with invalid email');
      })
      .catch((e) => {
        expect(e.message).to.contain(
          'Invalid email address and password combination'
        );
        done();
      });
  });
});
