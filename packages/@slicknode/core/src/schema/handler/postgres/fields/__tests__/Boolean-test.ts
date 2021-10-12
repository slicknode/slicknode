/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

describe('Postgres Field Handler: Boolean', () => {
  testCreateHandler(
    'Creates basic boolean field without index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    'create table "n_test_type" ("test" boolean)'
  );

  testCreateHandler(
    'Creates basic boolean field with index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" boolean);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates required boolean field with index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" boolean not null);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates unique boolean field with index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" boolean not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique boolean field with index on update',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: 'now',
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes not null constraint',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean)`
  );

  testUpdateHandler(
    'Adds not null constraint',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
alter table "n_test_type" alter column "test" set not null`
  );

  testUpdateHandler(
    'Creates unique constraint with existing index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Drops index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Adds index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")`
  );

  testUpdateHandler(
    'Drops unique constraint',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index',
    fields.Boolean,
    'test',
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'Boolean',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type boolean using ("test"::boolean);
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );
});
