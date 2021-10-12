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
import logoutUser from '../logoutUser';
import chaiAsPromised from 'chai-as-promised';
import { hashPassword } from '../../../../auth/utils';
import {
  generateAuthTokenSet,
  getRefreshTokenId,
} from '../../../../auth/utils';
import { GraphQLResolveInfo } from 'graphql';
import Context from '../../../../context';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

const TEST_EMAIL = 'mail@testemail.com';
const TEST_PASSWORD = 'validPassword1';

describe('logoutUser Mutation', () => {
  let context: Context;
  let user = null;
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
            done();
          })
          .catch((error) => done(error));
      });
    });

    after((done) => {
      destroyTestContext(context).then(() => done());
    });

    it('executes mutation successfully', (done) => {
      const input = {};

      const result = logoutUser.mutate(
        input,
        context,
        {} as GraphQLResolveInfo
      );

      result
        .then((response) => {
          expect(response).to.deep.equal({ success: true });
          done();
        })
        .catch((error) => {
          done(error);
        });
    });

    it('invalidates refresh token', async () => {
      if (!user || !context) {
        throw new Error('Required objects not available');
      }
      const { refreshToken } = await generateAuthTokenSet({
        context,
        user,
        moduleId: 'test',
      });
      expect(refreshToken).to.be.string;
      const tokenId = getRefreshTokenId(refreshToken, context);

      const storedToken = await context.db.RefreshToken.find({ id: tokenId });
      expect(storedToken).to.not.be.null;

      const result = await logoutUser.mutate(
        { refreshToken },
        context,
        {} as GraphQLResolveInfo
      );
      expect(result).to.deep.equal({ success: true });

      const storedTokenPostLogout = await context.db.RefreshToken.find({
        id: tokenId,
      });
      expect(storedTokenPostLogout).to.equal(null);
    });
  });
});
