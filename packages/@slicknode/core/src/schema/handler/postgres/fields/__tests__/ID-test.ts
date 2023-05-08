import { testCreateHandler } from './handlertest';
import * as fields from '../index';
import { FieldStorageType } from '../../../../../definition/FieldStorageType';

describe('Postgres Field Handler: ID', () => {
  testCreateHandler(
    'creates ID field for primary key with big serial',
    fields.ID,
    'id',
    {
      typeName: 'ID',
      required: true,
    },
    'create table "n_test_type" ("id" bigserial primary key)',
    {}
  );

  testCreateHandler(
    'creates ID field for primary key with big serial in schema',
    fields.ID,
    'id',
    {
      typeName: 'ID',
      required: true,
    },
    'create table "schema_name"."n_test_type" ("id" bigserial primary key)',
    {},
    'schema_name'
  );

  testCreateHandler(
    'creates ID field for primary key with UUID in schema',
    fields.ID,
    'id',
    {
      typeName: 'ID',
      required: true,
      storageType: FieldStorageType.UUID,
    },
    'create table "schema_name"."n_test_type" ("id" uuid default uuid_generate_v4(), constraint "n_test_type_pkey" primary key ("id"))',
    {},
    'schema_name'
  );

  testCreateHandler(
    'creates ID field for primary key with UUID in default schema',
    fields.ID,
    'id',
    {
      typeName: 'ID',
      required: true,
      storageType: FieldStorageType.UUID,
    },
    'create table "n_test_type" ("id" uuid default uuid_generate_v4(), constraint "n_test_type_pkey" primary key ("id"))',
    {}
  );
});
