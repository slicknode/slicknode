import {
  buildModules,
  Context,
  createProjectSchema,
  loadProjectRootConfig,
  migrateModules,
  ModuleConfig,
  ModuleKind,
  ModuleSettingsMap,
  ProjectRootConfig,
  SchemaBuilder,
  UserError,
  validateProject,
} from '@slicknode/core';
import { NodeRuntime, RuntimeInterface } from '@slicknode/runtime-executor';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Knex } from 'knex';
import knex from 'knex';
import {
  DatabaseConfig,
  DatabaseConnectionConfig,
  SlicknodeHandlerOptions,
} from '../types';
import * as path from 'path';
import { asyncMiddleware, combineMiddlewares, resolveThunk } from '../helpers';
import { DB_SETUP_QUERIES } from '@slicknode/core/build/db';
import watchFs from 'node-watch';
import crypto from 'crypto';

/**
 * Middleware that creates the Slicknode context and assigns it to the request object
 * req.context
 *
 * If database migrations are enabled via options, incoming requests will be queued
 * and resolved when the DB migrations are complete.
 *
 * @param options
 * @returns
 */
export const contextMiddleware = (
  options: SlicknodeHandlerOptions
): RequestHandler => {
  const {
    dir = process.cwd(),
    jwtSecret = 'somesecret',
    moduleSettings = {},
    database,
    forceMigrate = false,
    watch = false,
    projectEndpoint,
  } = options;

  let schemaBuilder: SchemaBuilder;
  let defaultRuntime: RuntimeInterface;
  let resolvedModuleSettings: ModuleSettingsMap;
  let resolvedDatabase: DatabaseConfig;
  let dbWrite: Knex;
  let dbRead: Knex | null = null;

  const requestQueue: Array<[() => void, (e: Error) => void]> = [];
  let initializing = false;
  const rootDir = path.resolve(dir);

  async function init() {
    try {
      initializing = true;
      let projectComponents: ProjectComponents;

      // Resolve configs etc. in parallel
      [resolvedModuleSettings, resolvedDatabase, projectComponents] =
        await Promise.all([
          resolveThunk(moduleSettings),
          resolveThunk(database),
          loadProject({ dir: rootDir, hotReload: watch }),
        ]);

      const modules = projectComponents.modules;
      defaultRuntime = projectComponents.defaultRuntime;
      schemaBuilder = projectComponents.schemaBuilder;

      // Create DB connections / pools
      dbWrite = createKnex(resolvedDatabase.connection);
      if (resolvedDatabase.replicaConnection) {
        dbRead = createKnex(resolvedDatabase.replicaConnection);
      }

      // Apply DB migrations
      if (forceMigrate) {
        // Check if schema exists
        await dbWrite.transaction(async (trx) => {
          for (const query of DB_SETUP_QUERIES) {
            await trx.raw(query);
          }
          await createProjectSchema({
            db: trx,
            schemaName: resolvedDatabase.schemaName,
            // user: resolvedDatabase.connection.user,
          });
          await migrateModules(
            modules,
            trx,
            resolvedDatabase.schemaName || 'public'
          );
        });
      }

      // Resolve request queue and process pending requests
      requestQueue.map(([resolve]) => resolve());
    } catch (e: any) {
      console.error(`Error initializing Slicknode: ${e.message}`);
      process.exit(1);
    } finally {
      initializing = false;
    }
  }

  // Start watch mode if enabled
  if (watch) {
    console.warn('Starting watch mode. Do not use this in production.');
    if (forceMigrate) {
      console.warn(
        'WARNING: Watch mode enabled with force migrate. Migrations will be applied immediately which can lead to data loss.'
      );
    }
    initWatcher({ dir: rootDir, hotReload: watch }, async (values) => {
      if (forceMigrate) {
        if (!dbWrite) {
          console.error(
            'Could not apply migrations. DB connection not yet initialized'
          );
        } else {
          console.log('Applying database migrations');
          await migrateModules(
            values.modules,
            dbWrite,
            resolvedDatabase.schemaName || 'public'
          );
          console.log('Database migrations complete');
        }
      }

      // Update schema builder, runtime etc.
      schemaBuilder = values.schemaBuilder;
      defaultRuntime = values.defaultRuntime;
      console.log('API updated');
    });
  }

  init().then(
    () => {
      console.log('Initialization successful');
    },
    (err) => {
      console.error(`Failed to initialize Slicknode: ${err.messsage}`);
    }
  );
  return combineMiddlewares([
    // @TODO: Add auth middleware
    asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
      // Wait for initialization, add request to queue
      if (initializing) {
        await new Promise<void>((resolve, reject) =>
          requestQueue.push([resolve, reject])
        );
      }

      // Get default locale / Preview from request headers if set
      const defaultLocale = req.get('x-slicknode-locale') || undefined;
      if (
        defaultLocale &&
        !defaultLocale.match(/^[a-z]{2,3}(?:-[A-Z]{2,3}(?:-[a-zA-Z]{4})?)?$/)
      ) {
        throw new UserError(
          'Invalid value passed in X-Slicknode-Locale header'
        );
      }
      const defaultPreview = req.get('x-slicknode-preview') === '1';

      // Clear require cache in watch mode to auto update
      // runtime scripts on each request
      // if (watch) {
      //   for (const key in require.cache) {
      //     // Only invalidate cache for project files
      //     if (key.startsWith(rootDir)) {
      //       delete require.cache[key];
      //     }
      //   }
      // }

      // Create Project Context
      const context = new Context({
        req,
        res,
        jwtSecret,
        ...(defaultRuntime ? { defaultRuntime } : {}),
        schemaBuilder,
        dbSchemaName: resolvedDatabase.schemaName,
        moduleSettings: resolvedModuleSettings,
        // surrogateCache,
        projectEndpoint,
        defaultLocale,
        defaultPreview,
      });

      // Set DB connection in context
      context.setDBWrite(dbWrite);
      if (dbRead) {
        context.setDBRead(dbRead);
      }

      req.context = context;
      next();
    }),
  ]);
};

/**
 * Creates a knex object from a database connection config
 * @param config
 * @returns
 */
function createKnex(config: DatabaseConnectionConfig): Knex {
  return knex({
    client: 'pg',
    connection: config.url,
    acquireConnectionTimeout: 5000,
    pool: {
      min: config.pool?.min || 5,
      max: config.pool?.max || 25,
    },
  });
}

type WatcherOptions = {
  // The directory to watch for changes
  dir: string;

  // Automatically reload JS source files from handler functions
  hotReload: boolean;
};

function initWatcher(
  options: WatcherOptions,
  onChange: (projectComponents: ProjectComponents) => void
) {
  const { dir, hotReload } = options;

  // Store hash of config to prevent unnecessary migration / update
  let previousConfigHash: string;

  watchFs(
    dir,
    {
      delay: 200,
      recursive: true,
      filter(f, skip) {
        // skip node_modules
        if (/\/node_modules/.test(f)) return skip;
        // skip .git folder
        if (/\.git/.test(f)) return skip;
        // only watch for graphql, yml files
        return /\.(yml|graphql|slicknoderc)$/.test(f);
      },
    },
    (event, name) => {
      console.log('Files updated > reloading config');
      loadProject({ dir, hotReload }).then(
        (components) => {
          const configHash = crypto
            .createHash('sha256')
            .update(JSON.stringify(components.modules))
            .digest('base64');
          if (configHash !== previousConfigHash) {
            previousConfigHash = configHash;
            onChange(components);
          } else {
            console.log('No migration required, skipping');
          }
        },
        (err) => {
          console.log(`Error: ${err.message}`);
        }
      );
    }
  );
}

type ProjectComponents = {
  schemaBuilder: SchemaBuilder;
  modules: ModuleConfig[];
  defaultRuntime: RuntimeInterface;
};

/**
 * Loads the project config and creates runtimes, schemabuilder
 *
 * @param dir
 * @returns
 */
async function loadProject(params: {
  dir: string;
  hotReload: boolean;
}): Promise<ProjectComponents> {
  const { dir, hotReload } = params;
  let modules: ModuleConfig[];
  let projectRootConfig: ProjectRootConfig;

  try {
    [modules, projectRootConfig] = await Promise.all([
      buildModules(dir),
      loadProjectRootConfig(path.join(dir, 'slicknode.yml')),
    ]);

    // Validate project config
    const errors = validateProject(modules, []);
    if (errors.length) {
      errors.forEach((err) => {
        console.log('Errors', err.message);
      });
    }

    // Get all dynamic modules
    const dynamicModules = modules.filter(
      (module) => module.kind === ModuleKind.DYNAMIC && module.runtime
    );

    const defaultRuntime = new NodeRuntime({
      // Register all dynamic modules in runtime
      modules: dynamicModules.map((module) => ({
        moduleId: module.id,
        modulePath: path.resolve(
          path.join(dir, projectRootConfig.dependencies[module.id])
        ),
      })),
      watch: hotReload,
    });

    // Create schemabuilder, runtime etc.
    const schemaBuilder = new SchemaBuilder({
      modules,
    });

    return {
      schemaBuilder,
      defaultRuntime,
      modules,
    };
  } catch (e: any) {
    console.log('The project config contains errors: ', e.message);
  }

  throw new Error('Error loading project config');
}
