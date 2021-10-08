/**
 * Created by Ivo Meißner on 24.11.16.
 */
import { Request, Response } from 'express';

import DataLoader from 'dataloader';
import { toGlobalId, fromGlobalId } from '../utils/id';
import SchemaBuilder from '../schema/builder';
import { createPermissionQuerySchema, AuthContext, Role } from '../auth';
import {
  ConnectionConfig,
  ProjectRuntimeInfo,
  isContent,
  TypeConfig,
  isNode,
  isContentUnion,
} from '../definition';
import Knex$Knex from 'knex';
import { GraphQLSchema } from 'graphql';
import { DEFAULT_LOCALE } from '../config';
import { getAuthContext } from '../auth/utils';
import { getConnection, getSchemaName } from '../db/index';
import { getHandler, createDbProxy, HANDLER_POSTGRES } from '../schema/handler';
import { DbProxy } from '../schema/handler';
import { createConnectionLoader } from '../schema/connectionBuilder';
import {
  RuntimeInterface,
  ExecutionContext,
} from '@slicknode/runtime-executor';
import { UnconfiguredRuntime } from '@slicknode/runtime-executor';
import _ from 'lodash';
import { PROJECT_ENDPOINT } from '../config';
import { generateAccessToken, getIssuer } from '../auth/utils';
import { ModuleSettingsMap } from '../definition/ModuleSettings';
import { ContextCache, ContextCacheInterface } from './ContextCache';
import { Path } from 'graphql/jsutils/Path';
import { SurrogateCacheInterface } from '../cache/surrogate';

export type ContextOptions = {
  res: Response;
  req: Request;
  schemaBuilder: SchemaBuilder;
  jwtSecret: string;
  project?: ProjectRuntimeInfo;
  auth?: AuthContext;
  // The slicknode runtime for user code
  defaultRuntime?: RuntimeInterface;
  moduleSettings?: ModuleSettingsMap;
  dbSchemaName?: string | null | undefined;
  defaultLocale?: string;

  // HTTP endpoint to the project API that must be reachable from
  // where the runtime code (extensions) is executed
  projectEndpoint?: string;

  // If true, use preview data by default
  defaultPreview?: boolean;
  surrogateCache?: SurrogateCacheInterface | null;
};

// Nested structure that contains the locales for the resolved paths
type LocaleTree = {
  locale: string | null;
  children: {
    [key: string]: LocaleTree;
  };
};

// Nested structure that contains the preview mode for the resolved paths
type PreviewTree = {
  preview: boolean | null;
  children: {
    [key: string]: PreviewTree;
  };
};

export default class Context {
  /**
   * Express request object
   */
  req: Request;

  /**
   * Express response object
   */
  res: Response;

  /**
   * The Auth context
   */
  auth: AuthContext;

  /**
   * Knex instance for read DB
   */
  _dbRead: Knex$Knex | undefined | null;

  /**
   * Knex instance for write DB
   */
  _dbWrite: Knex$Knex | undefined | null;

  /**
   * The DB schema name
   */
  _dbSchemaName: string | undefined | null;

  /**
   * SchemaBuilder
   */
  schemaBuilder: SchemaBuilder;

  /**
   * The current project runtime information, NULL if we are on root schema
   */
  project: ProjectRuntimeInfo | undefined | null;

  /**
   * Current locale
   */
  locale: string;

  /**
   * HTTP endpoint to the project API that must be reachable from
   * where the runtime code (extensions) is executed
   */
  _projectEndpoint: string;

  /**
   * A cache for the dataloaders where the key is the GraphQL type name
   */
  _loaders: {
    [cacheKey: string]: DataLoader<string, any>;
  };

  /**
   * DataLoaders for connections
   */
  _connectionLoaders: {
    [key: string]: DataLoader<string, any>;
  };

  /**
   * True if there is an active transaction running
   */
  transacting: boolean;

  /**
   * A cache for permission filtering schemas
   */
  _permissionSchemas: {
    [typeName: string]: GraphQLSchema;
  };

  /**
   * Cached map of slicknode runtimes to execute user code
   */
  _runtimes: {
    [moduleId: string]: RuntimeInterface;
  };

  /**
   * The default runtime to execute user code
   */
  _defaultRuntime: RuntimeInterface | undefined | null;

  /**
   * Cached map of runtime execution contexts
   */
  _runtimeExecutionContexts: {
    [moduleId: string]: ExecutionContext;
  };

  /**
   * Temporary caches of the context
   */
  _tempCaches: {
    [namespace: string]: ContextCacheInterface<any, any>;
  };

  /**
   * Locales for the paths of the current execution. (Used to implement cascading locale)
   */
  _localePaths: LocaleTree;

  /**
   * Preview settings for the paths of the execution. (Used to implement cascading preview)
   */
  _previewPaths: PreviewTree;

  /**
   * Proxy to the data store to directly query DB
   */
  db: DbProxy;

  /**
   * The secret key for JWT tokens
   */
  jwtSecret: string;

  /**
   * Module settings
   */
  moduleSettings: ModuleSettingsMap;

  /**
   * The default ISO locale code
   */
  defaultLocale: string;

  /**
   * Surrogate cache instance to manage surrogate headers
   */
  surrogateCache: SurrogateCacheInterface | null;

  /**
   * Constructor
   * @param options
   */
  constructor(options: ContextOptions) {
    this.res = options.res;
    this.req = options.req;
    this.schemaBuilder = options.schemaBuilder;
    this.project = options.project || null;
    this.locale = _.get(options.req, 'locale', DEFAULT_LOCALE);
    this.jwtSecret = options.jwtSecret;
    this.moduleSettings = options.moduleSettings || {};
    this._loaders = {};
    this._permissionSchemas = {};
    this._connectionLoaders = {};
    this._runtimes = {};
    this._tempCaches = {};
    this._runtimeExecutionContexts = {};
    this._defaultRuntime = options.defaultRuntime || null;
    this._dbSchemaName = options.dbSchemaName || null;
    this._projectEndpoint = options.projectEndpoint || PROJECT_ENDPOINT;
    this._localePaths = {
      locale: options.defaultLocale,
      children: {},
    };
    this._previewPaths = {
      preview: Boolean(options.defaultPreview),
      children: {},
    };
    this.auth =
      options.auth ||
      getAuthContext(options.req, this.project, options.jwtSecret);
    this.db = createDbProxy(this);
    this.defaultLocale = options.defaultLocale || 'en-US';
    this.surrogateCache = options.surrogateCache || null;
  }

  /**
   * Returns the knex DB instance for read only access
   * If a connection to the write DB has already been established,
   * returns the write DB instance
   */
  getDBRead(): Knex$Knex {
    return (
      this._dbWrite ||
      this._dbRead ||
      (this._dbRead = getConnection(this.project, true))
    );
  }

  /**
   * Returns the knex DB instance for write access
   */
  getDBWrite(): Knex$Knex {
    return (
      this._dbWrite || (this._dbWrite = getConnection(this.project, false))
    );
  }

  /**
   * Sets the write DB for the context
   * @param db
   */
  setDBWrite(db: Knex$Knex): void {
    this._dbWrite = db;
  }

  /**
   * Sets the read DB for the context
   * @param db
   */
  setDBRead(db: Knex$Knex): void {
    this._dbRead = db;
  }

  /**
   * Returns the schema name, NULL if we are on root schema
   */
  getDBSchemaName(): string | undefined | null {
    return (
      this._dbSchemaName ||
      (this._dbSchemaName =
        this.project && this.project.id ? getSchemaName(this.project.id) : null)
    );
  }

  /**
   * Returns a caching instance for the provided namespace, to store arbitrary cached data
   * in the context object
   *
   * @param namespace
   */
  getTempCache<K, V>(namespace: string): ContextCacheInterface<K, V> {
    if (!this._tempCaches.hasOwnProperty(namespace)) {
      this._tempCaches[namespace] = new ContextCache<K, V>();
    }
    return this._tempCaches[namespace];
  }

  /**
   * Returns the dataloader for the type. The instance is cached in context so
   * that it is only initialized once per context
   *
   * @param typeName
   * @param key // The unique key that is used to fetch the objects
   * @param preview // Use preview storage
   * @param locale // ISO locale code
   */
  getLoader(
    typeName: string,
    key: string = 'id',
    preview: boolean = false,
    locale: string | null = null
  ): DataLoader<any, any> {
    const cacheKey = `${typeName}:${key}:${preview ? '1' : '0'}:${locale}`;
    if (!this._loaders.hasOwnProperty(cacheKey)) {
      const typeConfig: TypeConfig = this.schemaBuilder.typeConfigs[typeName];

      if (isNode(typeConfig)) {
        // Validate Node configuration
        const fieldConfig = typeConfig.fields[key];
        if (
          !fieldConfig ||
          (!fieldConfig.unique &&
            key !== 'id' &&
            !(key === 'contentNode' && isContent(typeConfig)))
        ) {
          throw new Error(
            `Field "${key}" on type "${typeConfig.name}" does not exist or is not unique.`
          );
        }

        const handler = getHandler(typeConfig.handler);
        this._loaders[cacheKey] = handler.getLoader(
          typeConfig,
          this,
          key,
          preview,
          locale
        );
      } else if (isContentUnion(typeConfig, this.schemaBuilder.typeConfigs)) {
        const handler = getHandler({
          kind: HANDLER_POSTGRES, // @TODO: Hardcoded for now, make dynamic once we support multiple handlers
        });
        this._loaders[cacheKey] = handler.getLoader(
          typeConfig,
          this,
          key,
          preview,
          locale
        );
      } else {
        throw new Error(
          `No loader can be created for field "${key}" on type "${typeConfig.name}"`
        );
      }
    }
    return this._loaders[cacheKey];
  }

  /**
   * Returns the runtime for the the given module to execute user code
   *
   * @param moduleId
   * @returns {Promise<void>}
   */
  async getRuntime(
    moduleId: string
  ): Promise<RuntimeInterface | undefined | null> {
    if (!this._runtimes.hasOwnProperty(moduleId)) {
      this._runtimes[moduleId] = this._defaultRuntime
        ? this._defaultRuntime
        : new UnconfiguredRuntime();
    }

    return this._runtimes[moduleId];
  }

  /**
   * Sets the runtime for the given module
   * @param moduleId
   * @param runtime
   */
  setRuntime(moduleId: string, runtime: RuntimeInterface) {
    this._runtimes[moduleId] = runtime;
  }

  /**
   * Returns the runtime execution context that is passed to the runtime
   * modules to execute user code
   *
   * @param moduleId
   * @returns {{}}
   */
  getRuntimeExecutionContext(moduleId: string): ExecutionContext {
    if (!this._runtimeExecutionContexts.hasOwnProperty(moduleId)) {
      this._runtimeExecutionContexts[moduleId] = {
        request: {
          ip: this.req.ip || null,
          id: null,
        },
        api: {
          accessToken: generateAccessToken({
            user: {
              id: this.auth.uid,
              roles: _.uniq([...(this.auth.roles || []), Role.RUNTIME]),
              isActive: Boolean(this.auth.uid),
            },
            issuer: getIssuer(this.project),
            maxAge: 120, // Maximum age of the token in seconds
            write: this.auth.write,
            secret: this.jwtSecret,
          }),
          endpoint: this._projectEndpoint
            .split('{alias}')
            .join(this.project ? this.project.alias : '_root'),
        },
        project: {
          alias: (this.project && this.project.alias) || null,
        },
        module: {
          id: moduleId,
        },
        settings: this.getModuleSettings(moduleId),
      };
    }

    return this._runtimeExecutionContexts[moduleId];
  }

  getModuleSettings(moduleId: string): {
    [x: string]: any;
  } {
    return this.moduleSettings[moduleId] || {};
  }

  /**
   * Takes a type name and an ID specific to that type name, and returns a
   * "global ID" that is unique among all types.
   */
  toGlobalId(typeName: string, id: string): string {
    return toGlobalId(typeName, id);
  }

  /**
   * Takes the "global ID" created by toGlobalID, and returns the type name and ID
   * used to create it.
   */
  fromGlobalId(globalId: string): {
    type: string;
    id: string;
  } {
    return fromGlobalId(globalId);
  }

  /**
   * Returns the DataLoader for connections
   * @param config
   * @param preview
   * @param locale // ISO locale code
   */
  getConnectionLoader(
    config: ConnectionConfig,
    preview: boolean,
    locale: string | null = null
  ): DataLoader<any, any> {
    const loaderKey = `${config.name}.${config.source.typeName}:${String(
      preview
    )}:${locale}`;
    if (!this._connectionLoaders.hasOwnProperty(loaderKey)) {
      this._connectionLoaders[loaderKey] = createConnectionLoader(
        config,
        this,
        preview,
        locale
      );
    }
    return this._connectionLoaders[loaderKey];
  }

  /**
   * Returns the folder where files are stored
   */
  getProjectFolderName(): string {
    return this.project ? this.project.alias : '_root';
  }

  /**
   * Returns the (memoized) permission filter schema
   * @param typeName
   */
  getPermissionSchema(typeName: string): GraphQLSchema {
    if (!this._permissionSchemas.hasOwnProperty(typeName)) {
      this._permissionSchemas[typeName] = createPermissionQuerySchema(
        this.schemaBuilder.getSchema(),
        this.schemaBuilder.getObjectTypeConfig(typeName)
      );
    }

    return this._permissionSchemas[typeName];
  }

  /**
   * Resolves the given action within a transaction
   *
   * @param action
   */
  async transaction<TResult>(
    action: (cont: Context) => Promise<TResult>
  ): Promise<TResult> {
    return await new Promise((resolve, reject) => {
      const db = this.getDBWrite();
      if (this.transacting || db.client.transacting) {
        throw new Error('Nested transactions are not supported at the moment');
      }
      this.transacting = true;

      db.transaction(async (trx: Knex$Knex) => {
        const trxContext: Context = _.clone(this as Context);
        trxContext.setDBWrite(trx);
        trxContext.db = createDbProxy(trxContext);

        return await action(trxContext);
      })
        .then((result) => {
          this.transacting = false;
          resolve(result);
        })
        .catch((err) => {
          this.transacting = false;
          reject(err);
        });
    });
  }

  /**
   * Sets the locale for the execution path
   * @param path
   * @param locale
   */
  setLocale(path: Path, locale: string) {
    let current = path;
    let currentNode = this._localePaths;

    const fields: string[] = [];
    // Iterate over path and see if we have match in path
    while (current) {
      fields.push(String(current.key));
      current = current.prev;
    }
    fields.reverse();

    for (const field of fields) {
      if (!currentNode.children.hasOwnProperty(field)) {
        const newNode: LocaleTree = {
          locale: null,
          children: {},
        };
        currentNode.children[field] = newNode;
        currentNode = newNode;
      } else {
        currentNode = currentNode.children[field];
      }
    }

    currentNode.locale = locale;
  }

  /**
   * Returns the locale for the current path
   * @param path
   */
  getLocale(path: Path): string {
    let current = path;
    let pathSetting: LocaleTree = this._localePaths;
    let locale = pathSetting.locale;

    const fields: string[] = [];
    // Iterate over path and see if we have match in path
    while (current) {
      fields.push(String(current.key));
      current = current.prev;
    }
    fields.reverse();

    // Iterate over path and see if we have match in path
    for (const field of fields) {
      if (pathSetting.children.hasOwnProperty(field)) {
        pathSetting = pathSetting.children[field];
        if (pathSetting.locale !== null) {
          locale = pathSetting.locale;
        }
      } else {
        break;
      }
    }

    return locale;
  }

  /**
   * Sets the preview setting for the execution path
   * @param path
   * @param preview
   */
  setPreview(path: Path, preview: boolean) {
    let current = path;
    let currentNode = this._previewPaths;

    const fields: string[] = [];
    // Iterate over path and see if we have match in path
    while (current) {
      fields.push(String(current.key));
      current = current.prev;
    }
    fields.reverse();

    for (const field of fields) {
      if (!currentNode.children.hasOwnProperty(field)) {
        const newNode: PreviewTree = {
          preview: null,
          children: {},
        };
        currentNode.children[field] = newNode;
        currentNode = newNode;
      } else {
        currentNode = currentNode.children[field];
      }
    }

    currentNode.preview = preview;
  }

  /**
   * Returns the preview setting for the current path
   * @param path
   */
  getPreview(path: Path): boolean {
    let current = path;
    let pathSetting: PreviewTree = this._previewPaths;
    let preview = pathSetting.preview;

    const fields: string[] = [];
    // Iterate over path and see if we have match in path
    while (current) {
      fields.push(String(current.key));
      current = current.prev;
    }
    fields.reverse();

    // Iterate over path and see if we have match in path
    for (const field of fields) {
      if (pathSetting.children.hasOwnProperty(field)) {
        pathSetting = pathSetting.children[field];
        if (pathSetting.preview !== null) {
          preview = pathSetting.preview;
        }
      } else {
        break;
      }
    }

    return preview;
  }

  /**
   * Clears all cached values and instances from context
   */
  clearCache(): void {
    this._loaders = {};
    this._permissionSchemas = {};
    this._connectionLoaders = {};
    this._tempCaches = {};
    this._localePaths = {
      locale: this.defaultLocale,
      children: {},
    };
    this._previewPaths = {
      preview: false,
      children: {},
    };
  }
}
