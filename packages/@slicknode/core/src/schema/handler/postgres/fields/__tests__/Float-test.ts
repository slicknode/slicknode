/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

describe('Postgres Field Handler: Float', () => {
  testCreateHandler(
    'Creates basic text field without index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    'create table "n_test_type" ("test" double precision)'
  );

  testCreateHandler(
    'Creates basic double precision field with index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" double precision);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates required double precision field with index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" double precision not null);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates unique double precision field with index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" double precision not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique text field with index on update',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'Float',
      required: true,
      defaultValue: 'now',
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes not null constraint',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Float',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision)`
  );

  testUpdateHandler(
    'Adds not null constraint',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
alter table "n_test_type" alter column "test" set not null`
  );

  testUpdateHandler(
    'Creates unique constraint with existing index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Drops index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Adds index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")`
  );

  testUpdateHandler(
    'Drops unique constraint',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index',
    fields.Float,
    'test',
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'Float',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type double precision using ("test"::double precision);
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );
});
