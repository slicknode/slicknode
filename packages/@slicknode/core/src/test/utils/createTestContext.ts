/**
 * Created by Ivo Meißner on 23.01.19
 *
 */

import {
  // MutationConfig,
  ModuleConfig,
} from '../../definition';
import SchemaBuilder from '../../schema/builder';
import httpMocks from 'node-mocks-http';
import knex from 'knex';

import { createProjectSchema, migrateModules } from '../../migration/index';
import { DB_MASTER, JWT_SECRET } from '../../config';

import Context from '../../context';
import { getConnection, initializeSchema, DB_SETUP_QUERIES } from '../../db';
import { TEST_DB_PREFIX } from './constants';
import { ContextOptions } from '../../context/Context';

export default async function createTestContext(
  modules: Array<ModuleConfig>,
  contextOptions: Partial<ContextOptions> = {}
): Promise<Context> {
  const conn = getConnection();
  const dbName =
    TEST_DB_PREFIX +
    '_' +
    new Date()
      .toISOString()
      .replace(/T|-|:|\./g, '_')
      .replace('Z', '');

  await conn.raw(`CREATE DATABASE ${dbName};`);

  const testDBConfig = {
    client: 'pg',
    connection: {
      ...DB_MASTER,
      database: dbName,
    },
    debug: false,
    acquireConnectionTimeout: 5000,
  };
  const testConnection = knex(testDBConfig);

  // Run DB setup scripts
  for (let i = 0; i < DB_SETUP_QUERIES.length; i++) {
    await testConnection.raw(DB_SETUP_QUERIES[i]);
  }

  const schemaName = contextOptions.dbSchemaName || null;

  if (schemaName) {
    await createProjectSchema({
      db: testConnection,
      schemaName,
    });
  }
  await initializeSchema(schemaName, testConnection);
  await testConnection.transaction(async (db) => {
    await migrateModules(modules, db, schemaName);
  });

  const schemaBuilder = new SchemaBuilder({ modules });
  const req = httpMocks.createRequest!({
    headers: {
      host: 'localhost:3000',
    },
  });

  const res = httpMocks.createResponse();

  // Add dummy translator
  res.__ = (text) => text;

  const context = new Context({
    ...contextOptions,
    res,
    req,
    jwtSecret: JWT_SECRET,
    schemaBuilder,
  });

  context.setDBWrite(testConnection);

  return context;
}
