/**
 * Created by Ivo Meißner on 24.01.17.
 *
 */

import { describe } from 'mocha';

import { testAddPermissionFilter } from './handlertest';

import schema from './applyPermissionQueryFilterSchema';

import { Role } from '../../../../auth';
/* eslint-disable no-unused-expressions, max-len */

describe('Permission query filtering', () => {
  /*
  import {executeWithTestContext} from '../../../../test/utils';
  if (1 === false) {
    before(done => {
      executeWithTestContext(schema, () => {
        done();
      });
    });
  }*/

  testAddPermissionFilter(
    'returns an unfiltered query for full access',
    'User',
    schema,
    [Role.AUTHENTICATED],
    'select * from "n_user"'
  );

  testAddPermissionFilter(
    'returns no nodes for no matching permissions',
    'User',
    schema,
    [],
    'select * from "n_user" where FALSE'
  );

  testAddPermissionFilter(
    'filters by field if field user is defined on type',
    'Article',
    schema,
    [Role.AUTHENTICATED],
    'select * from "n_article" where ((("n_article"."author" = 1::bigint)))'
  );

  testAddPermissionFilter(
    'filters by query through 1 connection edge',
    'Group',
    schema,
    [Role.AUTHENTICATED],
    'select * from "n_group" where (((exists (select "_f2"."id" from "n_membership" as "_f2" inner join "n_user" as "_f1" on "_f2"."user" = "_f1"."id" where "_f2"."group" = "n_group"."id" and "_f2"."user" = 1::bigint))))'
  );

  testAddPermissionFilter(
    'filters by query through 1 connection which is defined on connection node',
    'Comment',
    schema,
    [Role.AUTHENTICATED],
    // @TODO: Investigate, if we can get rid of the additional select of n_comment in the exists subquery
    'select * from "n_comment" where (((exists (select 1 from "n_article" as "_f1" where "n_comment"."article" = "_f1"."id" and "_f1"."author" = 1::bigint))))'
  );

  testAddPermissionFilter(
    'filters via n:1 inline > n:1 inline > n:m edge > 1:1 edge',
    'Comment',
    schema,
    [Role.STAFF],
    'select * from "n_comment" where (((exists (select 1 from "n_article" as "_f1" where "n_comment"."article" = "_f1"."id" and exists (select 1 from "n_user" as "_f2" where "_f1"."author" = "_f2"."id" and exists (select "_f4"."id" from "n_membership" as "_f4" inner join "n_group" as "_f3" on "_f4"."group" = "_f3"."id" where "_f4"."user" = "_f2"."id" and exists (select "_f6"."id" from "n_group_editor" as "_f6" inner join "n_user" as "_f5" on "_f6"."user" = "_f5"."id" where "_f6"."group" = "_f3"."id")))))))'
  );

  testAddPermissionFilter(
    'ignores other filters when one role has full access',
    'Group',
    schema,
    [Role.ADMIN, Role.AUTHENTICATED],
    'select * from "n_group"'
  );

  testAddPermissionFilter(
    'combines filters when multiple roles with query match',
    'Comment',
    schema,
    [Role.STAFF, Role.AUTHENTICATED],
    'select * from "n_comment" where (((exists (select 1 from "n_article" as "_f1" where "n_comment"."article" = "_f1"."id" and "_f1"."author" = 1::bigint))) or ((exists (select 1 from "n_article" as "_f2" where "n_comment"."article" = "_f2"."id" and exists (select 1 from "n_user" as "_f3" where "_f2"."author" = "_f3"."id" and exists (select "_f5"."id" from "n_membership" as "_f5" inner join "n_group" as "_f4" on "_f5"."group" = "_f4"."id" where "_f5"."user" = "_f3"."id" and exists (select "_f7"."id" from "n_group_editor" as "_f7" inner join "n_user" as "_f6" on "_f7"."user" = "_f6"."id" where "_f7"."group" = "_f4"."id")))))))'
  );
});
