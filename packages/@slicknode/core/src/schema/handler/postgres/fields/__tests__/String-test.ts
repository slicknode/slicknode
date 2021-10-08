/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

describe('Postgres Field Handler: String', () => {
  testCreateHandler(
    'Creates basic text field without index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    'create table "n_test_type" ("test" text)'
  );

  testCreateHandler(
    'Creates basic text field with index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" text);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates required text field with index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    'create table "n_test_type" ("test" text not null);\ncreate index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")'
  );

  testCreateHandler(
    'Creates unique text field with index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" text not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique text field with index on update',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'String',
      required: true,
      defaultValue: 'now',
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes not null constraint',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text)`
  );

  testUpdateHandler(
    'Adds not null constraint',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
alter table "n_test_type" alter column "test" set not null`
  );

  testUpdateHandler(
    'Creates unique constraint with existing index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Drops index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Drops index with schema name',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type text using ("test"::text);
drop index "testSchema"."ix_5b5e55bab2ec02b1e809b933d0a45bbc"`,
    {},
    'testSchema'
  );

  testUpdateHandler(
    'Adds index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")`
  );

  testUpdateHandler(
    'Drops unique constraint',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );

  testUpdateHandler(
    'Drops unique constraint with schema name',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "schemaName"."n_test_type" alter column "test" drop default;
alter table "schemaName"."n_test_type" alter column "test" drop not null;
alter table "schemaName"."n_test_type" alter column "test" type text using ("test"::text);
drop index "schemaName"."ix_61d3cb09ae8f74f27539907828608c90";
drop index "schemaName"."unique_61d3cb09ae8f74f27539907828608c90"`,
    {},
    'schemaName'
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index',
    fields.String,
    'test',
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'String',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`
  );
});
