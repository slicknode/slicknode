/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

describe('Postgres Field Handler: DateTime', () => {
  testCreateHandler(
    'Creates basic timestamptz field without index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      index: false,
    },
    'create table "n_test_type" ("test" timestamptz)'
  );

  testCreateHandler(
    'Creates basic timestamptz field with default current timestamp',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    'create table "n_test_type" ("test" timestamptz)'
  );

  testCreateHandler(
    'Creates basic timestamptz field with index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      index: true,
    },
    'create table "n_test_type" ("test" timestamptz);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates required timestamptz field with index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: true,
      index: true,
    },
    'create table "n_test_type" ("test" timestamptz not null);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates unique timestamptz field with index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: true,
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" timestamptz not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique text field with index on update',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'DateTime',
      required: true,
      defaultValue: 'now',
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes not null constraint',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz)`
  );

  testUpdateHandler(
    'Adds not null constraint',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
alter table "n_test_type" alter column "test" set not null`
  );

  testUpdateHandler(
    'Creates unique constraint with existing index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Drops index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Adds index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")`
  );

  testUpdateHandler(
    'Drops unique constraint',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index',
    fields.DateTime,
    'test',
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'DateTime',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type timestamptz using ("test"::timestamptz);
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );
});
