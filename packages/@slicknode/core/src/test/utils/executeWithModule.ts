/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */

import {
  // MutationConfig,
  ModuleConfig,
} from '../../definition';
import SchemaBuilder from '../../schema/builder';
import knex from 'knex';
import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import { formatError } from '../../errors';
import { createContextMockFromSchemaBuilder } from './createContextMock';
import middlewares from '../../middlewares';

import { migrateModules } from '../../migration/index';
import { DB_MASTER, JWT_SECRET } from '../../config';
import { TEST_DB_PREFIX } from './constants';

import Context from '../../context';
import { getConnection, initializeSchema, DB_SETUP_QUERIES } from '../../db';

/**
 * Executes the given function and passes the test express app and the schemaBuilder as arguments
 *
 * @param modules
 * @param execute
 */
export default function executeWithModule(
  modules: Array<ModuleConfig>,
  execute: (app: Function, context: Context) => void
): void {
  async function createModule(): Promise<{
    context: Context;
    app: express.Express;
  }> {
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

    await initializeSchema(null, testConnection);
    await testConnection.transaction(async (db) => {
      await migrateModules(modules, db);
    });

    const schemaBuilder = new SchemaBuilder({ modules });

    // Create express app
    const app = express();
    app.use(middlewares);

    // Create middleware
    app.use((req: any, res: any, next: Function) => {
      // Create context object
      const context = new Context({
        req,
        res,
        jwtSecret: JWT_SECRET,
        schemaBuilder,
      });
      context.setDBWrite(testConnection);
      const middleware = graphqlHTTP({
        schema: context.schemaBuilder.getSchema(),
        graphiql: true,
        context,
        customFormatErrorFn: formatError,
      });
      middleware(req, res);
    });

    const context = createContextMockFromSchemaBuilder(schemaBuilder);
    context.setDBWrite(testConnection);

    return {
      context,
      app,
    };
  }

  createModule()
    .then(({ app, context }) => execute(app, context))
    .catch((err) => {
      throw err;
    });
}
