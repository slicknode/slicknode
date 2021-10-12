import { ModuleSettingsMap } from '@slicknode/core';
import { ImageResizeOptions } from '@slicknode/image-transform';
import { AdminApiOptions } from '@slicknode/project-admin-api';

export interface DatabaseConnectionConfig {
  /**
   * The database connection string in the postgres connection URL format:
   * postgresql://[user[:password]@][netloc][:port][,...][/dbname][?param1=value1&...]
   *
   * Docs: https://www.postgresql.org/docs/current/libpq-connect.html
   *
   * Example:
   * postgresql://dbuser:mysecretpassword@localhost:5432/slicknode_dev
   */
  url: string;

  // DB Connection pool
  pool?: {
    // Minimum number of DB connections to keep open
    min: number;

    // Max number of DB connections
    max: number;
  };
}

export interface DatabaseConfig {
  // Schema name to use (defaults to "public")
  schemaName?: string;

  // Main database connection config
  connection: DatabaseConnectionConfig;

  // Read replica connection config
  replicaConnection?: DatabaseConnectionConfig;
}

export type MaybeThunk<TData> =
  | (() => Promise<TData>)
  | (() => TData)
  | NotFunction<TData>;

// eslint-disable-next-line @typescript-eslint/ban-types
type NotFunction<T> = Exclude<T, Function>;

export interface SlicknodeHandlerOptions {
  // Path where the slicknode project is located
  dir?: string;

  // Secret to generate JWT tokens
  jwtSecret?: string;

  // Watch for file system changes and automatically update on save
  watch?: boolean;

  // Module settings
  moduleSettings?: MaybeThunk<ModuleSettingsMap>;

  // Database configuration
  database: MaybeThunk<DatabaseConfig>;

  // HTTP endpoint to the project GraphQL API, reachable from where the
  // handler code is executed
  projectEndpoint: string;

  // Automatically apply migrations on start
  // WARNING: This will delete data without warning if types or fields are removed
  forceMigrate?: boolean;

  // Slicknode admin connector API configuration
  admin?: AdminApiOptions;

  // A list of valid CORS origins
  corsOrigins?: string[];

  // Configuration for image transform handler
  images?: ImageResizeOptions;
}
