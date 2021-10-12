/**
 * Created by Ivo Meißner on 10.01.17.
 *
 */

import _ from 'lodash';

import Knex$Knex from 'knex';
import { ModuleConfig } from '../definition';
import { initializeSchema, VERSION_TABLE } from '../db';
import Context, { createContext } from '../context';
import { Handler } from '../schema/handler/base';
import PostgresHandler from '../schema/handler/postgres';
import deepEqual from 'deep-equal';
import { upgradeModuleConfigs } from './upgradeConfig';

export { getNewSemverVersion } from './versioning';

/**
 * Creates and initializes a new project schema in the database
 *
 * @param params
 */
export async function createProjectSchema(params: {
  // DB connection
  db: Knex$Knex;
  // The user name that should get usage permissions on the schema objects
  user?: string;
  // The schema name
  schemaName: string | undefined | null;
}) {
  const { db, user, schemaName } = params;
  await db.raw('CREATE SCHEMA IF NOT EXISTS ??', schemaName);

  if (user) {
    await db.raw('GRANT USAGE ON SCHEMA ?? TO ??', [schemaName, user]);
    // Grant privileges for existing tables
    await db.raw('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ?? TO ??', [
      schemaName,
      user,
    ]);
    await db.raw('GRANT USAGE ON ALL SEQUENCES IN SCHEMA ?? TO ??', [
      schemaName,
      user,
    ]);

    // Grant privileges for new objects
    await db.raw(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON TABLES TO ??',
      [schemaName, user]
    );
    await db.raw(
      'ALTER DEFAULT PRIVILEGES IN SCHEMA ?? GRANT USAGE ON SEQUENCES TO ??',
      [schemaName, user]
    );
  }

  await initializeSchema(schemaName, db);
}

/**
 * Migrates all modules from the current state to the new modules state
 *
 * @param newModules
 * @param db
 * @param schemaName
 * @returns {Promise.<*>}
 */
export async function migrateModules(
  newModules: Array<ModuleConfig>,
  db: Knex$Knex,
  dbSchemaName?: string | undefined | null
): Promise<any> {
  const schemaName = dbSchemaName || 'public';
  const handlerOptions = {
    db,
    schemaName,
  };
  const currentModules = await loadCurrentModules({ db, schemaName });
  if (!currentModules) {
    throw new Error(`Database schema "${schemaName}" is not initialized`);
  }

  // Create handlers
  const handlers = [new PostgresHandler(handlerOptions)];

  // Run DB migrations
  const promises = _.map(handlers, (handler: Handler) =>
    handler.migrate(newModules, currentModules)
  );
  await Promise.all(promises);

  // Save version
  const addedVersion = await db
    .withSchema(schemaName)
    .insert({
      // We stringify to strip all resolver functions from native modules and non serializable data
      modules: prepareJsonValue(db, JSON.parse(serializeModules(newModules))),
    })
    .into(VERSION_TABLE)
    .returning('id');
  if (addedVersion.length) {
    // Delete all previous versions
    await db
      .withSchema(schemaName)
      .from(VERSION_TABLE)
      .whereNot('id', addedVersion[0])
      .delete();
  }

  // Check if we have fixtures
  await importFixtures({
    currentModules,
    newModules,
    db,
    schemaName,
  });
}

/**
 * Loads the current module configurations from the database
 * that match the database state
 *
 * Returns NULL if schema is not initialized
 */
export async function loadCurrentModules(params: {
  db: Knex$Knex;
  schemaName: string;
}): Promise<ModuleConfig[] | null> {
  const { db, schemaName } = params;
  let currentModules = [];

  // Check if table exists
  const schemaResult = await db.raw(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
    [schemaName, VERSION_TABLE]
  );
  if (!schemaResult.rows?.length) {
    return null;
  }

  // Load current serialized app config from project database, that the migration should be based upon
  const version = await db
    .withSchema(schemaName)
    .select('modules')
    .from(VERSION_TABLE)
    .limit(1)
    .orderBy('id', 'DESC');
  if (version.length !== 0) {
    // Upgrade to current config format
    currentModules = upgradeModuleConfigs(version[0].modules);
  }
  return currentModules;
}

async function importFixtures(params: {
  newModules: ModuleConfig[];
  currentModules: ModuleConfig[];
  db: Knex$Knex;
  schemaName: string | null;
}) {
  const { newModules, currentModules, db, schemaName } = params;

  const modulesWithFixtures = newModules.filter((module) => module.fixtures);

  // We have fixtures
  if (modulesWithFixtures.length) {
    let context: Context;
    for (const module of modulesWithFixtures) {
      // See if module already exists
      const currentModule = currentModules.find((m) => m.id === module.id);
      if (
        !currentModule ||
        !deepEqual(currentModule.fixtures, module.fixtures)
      ) {
        if (!context) {
          context = createContext(newModules, { dbSchemaName: schemaName });
          context.setDBWrite(db);
        }

        // Import all fixtures
        for (const fixture of module.fixtures) {
          if (currentModule) {
            await context.db[fixture.type].upsert(fixture.data);
          } else {
            await context.db[fixture.type].create(fixture.data);
          }
        }
      }
    }
  }
}

/**
 * Helper function to conditionally format JSON values for DB based on client driver
 * node-postgres does not handle JS arrays, so we have to stringify.
 * https://github.com/knex/knex/issues/3548
 * https://github.com/brianc/node-postgres/issues/442
 *
 * The RDS Data API client doesn't handle stringified objects
 *
 * @param db
 * @param value
 */
function prepareJsonValue(db: Knex$Knex, value: any) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && _.get(db, 'client.config.client') === 'pg') {
    return JSON.stringify(value);
  }
  return value;
}

function serializeModules(modules: Array<ModuleConfig>): string {
  // @TODO:
  // We substitute the resolvers since they can't be serialized
  // That way we can create a dummy resolver for the fields again to let
  // the migration handler know if the typeExtensions are persisted
  const serializedModules = modules.map((module) => {
    if (module.typeExtensions) {
      // Create new object where resolver is substituted by TRUE without mutating
      const serializedTypeExtensions = Object.keys(
        module.typeExtensions
      ).reduce((typeExtensionMap, typeName) => {
        typeExtensionMap[typeName] = Object.keys(
          module.typeExtensions[typeName]
        ).reduce((fieldMap, fieldName) => {
          // If we have custom resolver, substitute
          if (module.typeExtensions[typeName][fieldName].resolve) {
            fieldMap[fieldName] = {
              ...module.typeExtensions[typeName][fieldName],
              resolve: true,
            };
          } else {
            // Use config as is
            fieldMap[fieldName] = module.typeExtensions[typeName][fieldName];
          }
          return fieldMap;
        }, {});
        return typeExtensionMap;
      }, {});
      return {
        ...module,
        typeExtensions: {
          ...(serializedTypeExtensions || {}),
        },
      };
    }
    return module;
  });

  return JSON.stringify(serializedModules);
}
