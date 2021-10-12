/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import { TypeKind, TypeConfigMap } from '../../../../../definition';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

const testTypes: TypeConfigMap = {
  TestEnum: {
    kind: TypeKind.ENUM,
    name: 'TestEnum',
    description: 'Desc',
    values: {
      VAL1: {
        description: 'Desc 1',
        value: 1,
      },
      VAL2: {
        description: 'Desc 2',
        value: 2,
      },
    },
  },
};

const testTypes2: TypeConfigMap = {
  TestEnum: {
    kind: TypeKind.ENUM,
    name: 'TestEnum',
    description: 'Desc',
    values: {
      VAL1: {
        description: 'Desc 1',
        value: 1,
      },
      VAL2: {
        description: 'Desc 2',
        value: 2,
      },
      VAL3: {
        description: 'Desc 3',
        value: 3,
      },
    },
  },
};

describe('Postgres Field Handler: Enum', () => {
  testCreateHandler(
    'Creates basic enum field without index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    `create table "n_test_type" ("test" text);
alter table "n_test_type" add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2'))`,
    testTypes
  );

  testCreateHandler(
    'Creates basic enum field with index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" text);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2'))`,
    testTypes
  );

  testCreateHandler(
    'Creates required enum field with index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" text not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2'))`,
    testTypes
  );

  testCreateHandler(
    'Creates required unique enum field with index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" text not null);
alter table "n_test_type" add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2'));
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`,
    testTypes
  );

  testUpdateHandler(
    'Adds unique text field with index on update',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'TestEnum',
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
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Removes not null constraint',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text)`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Updates check constraint if value added to enum type',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
alter table "n_test_type" alter column "test" set not null;
alter table "n_test_type" drop constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0", add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2', '3'))`,
    testTypes2,
    null,
    testTypes
  );

  testUpdateHandler(
    'Updates check constraint if value removed from enum type',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
alter table "n_test_type" alter column "test" set not null;
alter table "n_test_type" drop constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0", add constraint "check_3594c6c00ed16bf597e660dcdeb6d6d0" check ("test" in ('1', '2'))`,
    testTypes,
    null,
    testTypes2
  );

  testUpdateHandler(
    'Adds not null constraint',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
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
alter table "n_test_type" alter column "test" set not null`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Adds not null constraint with schema name',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: true,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    // Note: Somehow knex adds drop NULL constraint before re-adding.
    // Not a big issue function wise since we run this in a transaction but not nice.
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type text using ("test"::text);
alter table "testSchema"."n_test_type" alter column "test" set not null`,
    testTypes,
    'testSchema',
    testTypes
  );

  testUpdateHandler(
    'Creates unique constraint with existing index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0"`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops index with schema name',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type text using ("test"::text);
drop index "testSchema"."ix_5b5e55bab2ec02b1e809b933d0a45bbc"`,
    testTypes,
    'testSchema',
    testTypes
  );

  testUpdateHandler(
    'Adds index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test")`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops unique constraint',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops unique constraint creating index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: false,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type text using ("test"::text);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0"`,
    testTypes,
    null,
    testTypes
  );

  testUpdateHandler(
    'Drops unique constraint but keeps index with schema name',
    fields.Enum,
    'test',
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: false,
    },
    {
      typeName: 'TestEnum',
      required: false,
      defaultValue: null,
      index: true,
      unique: true,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type text using ("test"::text);
create index "ix_5b5e55bab2ec02b1e809b933d0a45bbc" on "testSchema"."n_test_type" ("test");
drop index "testSchema"."unique_5b5e55bab2ec02b1e809b933d0a45bbc"`,
    testTypes,
    'testSchema',
    testTypes
  );
});
