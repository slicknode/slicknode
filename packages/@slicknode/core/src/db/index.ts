/**
 * Created by Ivo Meißner on 09.12.16.
 *
 */
import Knex$Knex from 'knex';
import knex from 'knex';
import uuid from 'uuid';
import { ProjectRuntimeInfo } from '../definition';
import _ from 'lodash';
import {
  DB_MASTER_HOST,
  DB_MASTER_PORT,
  DB_MASTER_HOST_REPLICA,
  DB_MASTER_PORT_REPLICA,
  DB_MASTER_USER,
  DB_MASTER_PASSWORD,
  DB_MASTER_DATABASE,
  DB_PROJECT_HOST,
  DB_PROJECT_PORT,
  DB_PROJECT_HOST_REPLICA,
  DB_PROJECT_PORT_REPLICA,
  DB_PROJECT_USER,
  DB_PROJECT_PASSWORD,
  DB_PROJECT_DATABASE,
} from '../config';

/**
 * A list of DB queries that are run immediately after database creation
 * To install extensions etc.
 *
 * @type {Array}
 */
export const DB_SETUP_QUERIES = [
  'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
];

export const VERSION_TABLE = 'sys_versions';

/**
 * Connection pool cache
 * @type {{}}
 */
const connectionCache = {};

/**
 * Returns the DB name for a project DB
 */
export function generateProjectDBName(): string {
  return 'pro_' + uuid.v1().replace(/-/g, '_');
}

/**
 * Returns the knex object for the given project alias
 * @param project
 * @param readOnly
 */
export function getConnection(
  project?: ProjectRuntimeInfo | undefined | null,
  readOnly: boolean = false
): Knex$Knex {
  let config;
  let useReadReplica = false;
  if (!project) {
    // Get root connection
    useReadReplica =
      readOnly &&
      DB_MASTER_HOST_REPLICA &&
      DB_MASTER_HOST_REPLICA !== DB_MASTER_HOST;
    config = {
      ...// Check if read replica is configured
      (useReadReplica
        ? {
            host: DB_MASTER_HOST_REPLICA,
            port: DB_MASTER_PORT_REPLICA,
          }
        : {
            host: DB_MASTER_HOST,
            port: DB_MASTER_PORT,
          }),
      user: DB_MASTER_USER,
      password: DB_MASTER_PASSWORD,
      database: DB_MASTER_DATABASE,
    };
  } else {
    // Get project connection
    useReadReplica =
      readOnly &&
      DB_PROJECT_HOST_REPLICA &&
      DB_PROJECT_HOST_REPLICA !== DB_PROJECT_HOST;
    // Check which DB we need to use

    let database: string = DB_PROJECT_DATABASE;

    // @TODO: project.rdbmsDatabase is deprecated and is only here because
    // tests rely on multiple databases per host (docker container) and pass this information
    if (project.rdbmsDatabase) {
      database = project.rdbmsDatabase.dbWrite;
    }
    if (
      readOnly &&
      project.rdbmsDatabase &&
      project.rdbmsDatabase.dbRead &&
      project.rdbmsDatabase.dbRead.length
    ) {
      database = _.sample(project.rdbmsDatabase.dbRead);
    }
    config = {
      ...// Check if read replica is configured
      (useReadReplica
        ? {
            host: DB_PROJECT_HOST_REPLICA,
            port: DB_PROJECT_PORT_REPLICA,
          }
        : {
            host: DB_PROJECT_HOST,
            port: DB_PROJECT_PORT,
          }),
      user: DB_PROJECT_USER,
      password: DB_PROJECT_PASSWORD,
      database,
    };
  }

  // When testing, we have multiple DBs on the same host, so include in cache key
  let cacheKeyPrefix = '';
  if (process.env.NODE_ENV === 'testing') {
    cacheKeyPrefix = project ? project.alias + ':' : '';
  }

  const cacheKey =
    cacheKeyPrefix +
    (config.host || 'null') +
    ':' +
    config.port +
    ':' +
    (useReadReplica ? 'r' : 'w');

  if (!connectionCache.hasOwnProperty(cacheKey)) {
    connectionCache[cacheKey] = knex({
      client: 'pg',
      connection: config,
      debug: false,
      acquireConnectionTimeout: 5000,
      pool: { min: 0, max: 25 },
    });
  }

  return connectionCache[cacheKey];
}

/**
 * Returns the schema name for the project
 * @param projectId
 */
export function getSchemaName(
  projectId: string | number | undefined | null
): string {
  return 'p' + String(projectId);
}

/**
 * Initializes the schema, creates system tables etc.
 * If no schemaName is provided, initializes `public` schema
 *
 * @param schemaName
 * @param dbConn
 * @returns {Promise.<void>}
 */
export async function initializeSchema(
  schemaName: string | undefined | null,
  dbConn: Knex$Knex
): Promise<void> {
  const hasVersionTable = await dbConn.schema
    .withSchema(schemaName)
    .hasTable(VERSION_TABLE);
  if (hasVersionTable) {
    return;
  }
  await dbConn.schema
    .withSchema(schemaName)
    .createTable(VERSION_TABLE, function (table) {
      table.bigIncrements().primary();
      table.jsonb('modules').notNullable();
      (table as any) // Override types bcs. 'datetime' does not exist in type defs
        .datetime('created_at')
        .notNullable()
        .defaultTo(dbConn.fn.now());
    });
}
