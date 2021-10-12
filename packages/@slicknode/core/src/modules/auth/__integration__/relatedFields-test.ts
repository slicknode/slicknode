/**
 * Created by Ivo Meißner on 15.06.18
 *
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createContextMock, executeQuery } from '../../../test/utils';

import { baseModules } from '../../index';
import { Role } from '../../../auth';

const queryRoles = `{
  viewer{
    roles
  }
}`;

describe('auth typeExtensions', () => {
  describe('Viewer.roles', () => {
    it('returns anonymous role for no roles set', (done) => {
      const context = createContextMock(baseModules);
      executeQuery(queryRoles, context)
        .then((result) => {
          expect(result).to.deep.equal({ viewer: { roles: ['ANONYMOUS'] } });
          done();
        })
        .catch(done);
    });

    it('returns empty array of roles for no roles set', (done) => {
      const context = createContextMock(baseModules);
      context.auth.roles = [];

      executeQuery(queryRoles, context)
        .then((result) => {
          expect(result).to.deep.equal({ viewer: { roles: [] } });
          done();
        })
        .catch(done);
    });

    it('returns roles from auth context', (done) => {
      const context = createContextMock(baseModules);
      context.auth.roles = [Role.ADMIN, Role.AUTHENTICATED];

      executeQuery(queryRoles, context)
        .then((result) => {
          expect(result).to.deep.equal({
            viewer: { roles: ['ADMIN', 'AUTHENTICATED'] },
          });
          done();
        })
        .catch(done);
    });
  });
});
