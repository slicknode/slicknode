/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

// import { expect } from 'chai';
import { describe } from 'mocha';

import { testCreateHandler, testUpdateHandler } from './handlertest';

import * as fields from '../index';
/* eslint-disable no-unused-expressions, max-len */

describe('Postgres Field Handler: RelatedObject', () => {
  testCreateHandler(
    'Creates basic RelatedObject field without index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    `create table "n_test_type" ("test" bigint);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node" ("id") on delete SET NULL`
  );

  testCreateHandler(
    'Creates basic related field with index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" bigint);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node" ("id") on delete SET NULL`
  );

  testCreateHandler(
    'Creates required related field with index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" bigint not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node" ("id") on delete CASCADE`
  );

  testCreateHandler(
    'Creates unique related field with index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" bigint not null);
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node" ("id") on delete CASCADE;
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique constraint and drops index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type bigint using ("test"::bigint);
alter table "n_test_type" alter column "test" set not null;
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes unique constraint and adds index',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type bigint using ("test"::bigint);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0";
`
  );

  testUpdateHandler(
    'Adds unique constraint and drops index with schema name',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type bigint using ("test"::bigint);
alter table "testSchema"."n_test_type" alter column "test" set not null;
drop index "testSchema"."ix_5b5e55bab2ec02b1e809b933d0a45bbc";
create unique index "unique_5b5e55bab2ec02b1e809b933d0a45bbc" on "testSchema"."n_test_type" ("test") where "test" is not null`,
    {},
    'testSchema'
  );

  testUpdateHandler(
    'Removes unique constraint and adds index with schema name',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    {
      typeName: 'RelatedTestNode',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type bigint using ("test"::bigint);
alter table "testSchema"."n_test_type" alter column "test" set not null;
create index "ix_5b5e55bab2ec02b1e809b933d0a45bbc" on "testSchema"."n_test_type" ("test");
drop index "testSchema"."unique_5b5e55bab2ec02b1e809b933d0a45bbc";
`,
    {},
    'testSchema'
  );

  testCreateHandler(
    'Creates basic RelatedObject field without index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: false,
      defaultValue: 'now',
      index: false,
    },
    `create table "n_test_type" ("test" uuid);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node_uuid" ("id") on delete SET NULL`
  );

  testCreateHandler(
    'Creates basic related field with index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: false,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" uuid);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node_uuid" ("id") on delete SET NULL`
  );

  testCreateHandler(
    'Creates required related field with index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
    },
    `create table "n_test_type" ("test" uuid not null);
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node_uuid" ("id") on delete CASCADE`
  );

  testCreateHandler(
    'Creates unique related field with index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `create table "n_test_type" ("test" uuid not null);
alter table "n_test_type" add constraint "fk_3594c6c00ed16bf597e660dcdeb6d6d0" foreign key ("test") references "n_related_test_node_uuid" ("id") on delete CASCADE;
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Adds unique constraint and drops index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type uuid using ("test"::uuid);
alter table "n_test_type" alter column "test" set not null;
drop index "ix_3594c6c00ed16bf597e660dcdeb6d6d0";
create unique index "unique_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test") where "test" is not null`
  );

  testUpdateHandler(
    'Removes unique constraint and adds index on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `alter table "n_test_type" alter column "test" drop default;
alter table "n_test_type" alter column "test" drop not null;
alter table "n_test_type" alter column "test" type uuid using ("test"::uuid);
alter table "n_test_type" alter column "test" set not null;
create index "ix_3594c6c00ed16bf597e660dcdeb6d6d0" on "n_test_type" ("test");
drop index "unique_3594c6c00ed16bf597e660dcdeb6d6d0";
`
  );

  testUpdateHandler(
    'Adds unique constraint and drops index with schema name on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type uuid using ("test"::uuid);
alter table "testSchema"."n_test_type" alter column "test" set not null;
drop index "testSchema"."ix_5b5e55bab2ec02b1e809b933d0a45bbc";
create unique index "unique_5b5e55bab2ec02b1e809b933d0a45bbc" on "testSchema"."n_test_type" ("test") where "test" is not null`,
    {},
    'testSchema'
  );

  testUpdateHandler(
    'Removes unique constraint and adds index with schema name on UUID reference',
    fields.RelatedObject,
    'test',
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: false,
    },
    {
      typeName: 'RelatedTestNodeUuid',
      required: true,
      defaultValue: 'now',
      index: true,
      unique: true,
    },
    `alter table "testSchema"."n_test_type" alter column "test" drop default;
alter table "testSchema"."n_test_type" alter column "test" drop not null;
alter table "testSchema"."n_test_type" alter column "test" type uuid using ("test"::uuid);
alter table "testSchema"."n_test_type" alter column "test" set not null;
create index "ix_5b5e55bab2ec02b1e809b933d0a45bbc" on "testSchema"."n_test_type" ("test");
drop index "testSchema"."unique_5b5e55bab2ec02b1e809b933d0a45bbc";
`,
    {},
    'testSchema'
  );
});
