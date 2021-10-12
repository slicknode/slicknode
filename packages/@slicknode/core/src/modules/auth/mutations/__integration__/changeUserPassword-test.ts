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
import changeUserPassword from '../changeUserPassword';
import loginUser from '../../../authEmailPassword/mutations/loginEmailPassword';
import chaiAsPromised from 'chai-as-promised';
import { hashPassword } from '../../../../auth/utils';
import { GraphQLResolveInfo } from 'graphql';
import Context from '../../../../context';
import { Role } from '../../../../auth';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

const TEST_EMAIL = 'mail@testemail.com';
const TEST_PASSWORD = 'validPassword1';

describe('changeUserPassword Mutation', () => {
  let context: Context;
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
          .then((result) => {
            user = result;
            c.auth.uid = user.id;
            c.auth.roles = [Role.AUTHENTICATED];
            done();
          })
          .catch((error) => done(error));
      });
    });

    after((done) => {
      destroyTestContext(context).then(() => done());
    });

    it('executes mutation successfully', (done) => {
      const input = {
        newPassword: 'newpassword',
        oldPassword: TEST_PASSWORD,
      };

      const result = changeUserPassword.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );

      result
        .then((response) => {
          expect(response.user.email).to.equal(TEST_EMAIL);
          expect(response.user.id).to.not.be.null;
          expect(response.refreshToken).to.not.be.null;
          expect(response.refreshTokenLifetime).to.not.be.null;
          expect(response.refreshTokenLifetime).to.be.above(0);
          expect(response.accessToken).to.not.be.null;
          expect(response.accessTokenLifetime).to.not.be.null;
          expect(response.accessTokenLifetime).to.be.above(0);

          // Check if login succeeds with new password
          const loginInput = {
            email: TEST_EMAIL,
            password: 'newpassword',
          };

          const loginResult = loginUser.mutate(
            loginInput,
            context,
            {} as GraphQLResolveInfo
          );

          loginResult
            .then((res) => {
              expect(res.user.email).to.equal(loginInput.email);
              expect(res.user.id).to.not.be.null;
              expect(res.refreshToken).to.not.be.null;
              expect(res.refreshTokenLifetime).to.not.be.null;
              expect(res.refreshTokenLifetime).to.be.above(0);
              expect(res.accessToken).to.not.be.null;
              expect(res.accessTokenLifetime).to.not.be.null;
              expect(res.accessTokenLifetime).to.be.above(0);
              done();
            })
            .catch((error) => {
              done(error);
            });
        })
        .catch((error) => {
          done(error);
        });
    });

    it('fails with invalid password', (done) => {
      const input = {
        newPassword: 'newpassword',
        oldPassword: 'invalidPassword',
      };

      const result = changeUserPassword.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );

      result
        .then(() => {
          done('Mutation did not fail with invalid password');
        })
        .catch(() => {
          done();
        });
    });

    it('fails with empty password', (done) => {
      const input = {
        newPassword: 'newpassword',
        oldPassword: null,
      };

      const result = changeUserPassword.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );

      result
        .then(() => {
          done('Mutation did not fail with empty password');
        })
        .catch(() => {
          done();
        });
    });

    it('fails with empty newPassword', (done) => {
      const input = {
        oldPassword: TEST_PASSWORD,
        newPassword: null,
      };

      const result = changeUserPassword.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );

      result
        .then(() => {
          done('Mutation did not fail with empty newPassword');
        })
        .catch(() => {
          done();
        });
    });
  });
});
