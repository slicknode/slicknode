/**
 * Created by Ivo Meißner on 21.12.16.
 *
 */

// Configure env vars
import { config } from 'dotenv';
config();

function getEnvVar<TValue extends string | number | null>(
  name: string,
  defaultValue?: TValue
): TValue {
  const value = process.env[name] || process.env[`SLICKNODE_${name}`];
  if (typeof value === 'undefined') {
    return defaultValue;
  } else if (typeof defaultValue === 'number') {
    return Number(value) as TValue;
  }
  return String(value) as TValue;
}

export const PRODUCTION = process.env.NODE_ENV === 'production';
export const SECRET_KEY = getEnvVar('SECRET_KEY', 'reallyreallylongdummykey');

export const JWT_SECRET = getEnvVar('JWT_SECRET', SECRET_KEY);

// Database config for master DB
export const DB_MASTER = {
  host: getEnvVar('DB_MASTER_HOST', 'localhost'),
  port: getEnvVar('DB_MASTER_PORT', '5432'),
  user: getEnvVar('DB_MASTER_USER', 'postgres'),
  password: getEnvVar('DB_MASTER_PASSWORD', 'mysecretpassword'),
  database: getEnvVar('DB_MASTER_DATABASE', 'master'),
};

// Master DB connection settings
export const DB_MASTER_HOST = getEnvVar('DB_MASTER_HOST', 'localhost');
export const DB_MASTER_PORT = getEnvVar('DB_MASTER_PORT', 5432);
export const DB_MASTER_HOST_REPLICA = getEnvVar('DB_MASTER_HOST_REPLICA');
export const DB_MASTER_PORT_REPLICA = getEnvVar('DB_MASTER_PORT_REPLICA', 5432);
export const DB_MASTER_USER = getEnvVar('DB_MASTER_USER', 'postgres');
export const DB_MASTER_PASSWORD = getEnvVar(
  'DB_MASTER_PASSWORD',
  'mysecretpassword'
);
export const DB_MASTER_DATABASE = getEnvVar('DB_MASTER_DATABASE', 'master');

// Project DB connection settings
export const DB_PROJECT_HOST = getEnvVar('DB_PROJECT_HOST', 'localhost');
export const DB_PROJECT_PORT = getEnvVar('DB_PROJECT_PORT', 5432);
export const DB_PROJECT_HOST_REPLICA = getEnvVar('DB_PROJECT_HOST_REPLICA');
export const DB_PROJECT_PORT_REPLICA = getEnvVar(
  'DB_PROJECT_PORT_REPLICA',
  5432
);
export const DB_PROJECT_USER = getEnvVar('DB_PROJECT_USER', 'postgres');
export const DB_PROJECT_DATABASE = getEnvVar('DB_PROJECT_DATABASE', 'postgres');
export const DB_PROJECT_PASSWORD = getEnvVar(
  'DB_PROJECT_PASSWORD',
  'mysecretpassword'
);

// Maximum number of nodes that are returned in one request via relay connection
export const CONNECTION_NODES_MAX = getEnvVar('CONNECTION_NODES_MAX', 100);

// Default number of connection nodes that is returned
export const CONNECTION_NODES_DEFAULT = getEnvVar(
  'CONNECTION_NODES_DEFAULT',
  10
);
export const MAX_QUERY_COMPLEXITY = getEnvVar('MAX_QUERY_COMPLEXITY', 1000);

// DB record limits
// Individual node limits in the following format: User:100,Locale:2
export const RECORD_LIMIT_NODE_MAX = getEnvVar('RECORD_LIMIT_NODE_MAX', '');
// Total number of records
export const RECORD_LIMIT_TOTAL = getEnvVar('RECORD_LIMIT_TOTAL', 0);

export const DECIMAL_MAX_PRECISION = 1000;
export const DECIMAL_MAX_SCALE = 1000;

export const DEFAULT_LOCALE = 'en';

// Minimum age of cache duration in seconds
export const CACHE_MIN_AGE = getEnvVar('CACHE_MIN_AGE', 3600);
export const CACHE_REMOTE_DATA_DEFAULT_AGE = 86400;

// S3 Settings
export const S3_AWS_SECRET_KEY =
  getEnvVar('S3_AWS_SECRET_ACCESS_KEY', '') ||
  // @deprecated S3_AWS_SECRET_KEY is deprecated
  getEnvVar('S3_AWS_SECRET_KEY', '');
export const S3_AWS_ACCESS_KEY =
  getEnvVar('S3_AWS_ACCESS_KEY_ID', '') ||
  // @deprecated S3_AWS_ACCESS_KEY is deprecated
  getEnvVar('S3_AWS_ACCESS_KEY', '');

export const S3_FILE_PRIVATE_BUCKET = getEnvVar(
  'S3_FILE_PRIVATE_BUCKET',
  'upload'
);
export const S3_FILE_PRIVATE_ENDPOINT = getEnvVar(
  'S3_FILE_PRIVATE_ENDPOINT',
  'http://localhost:9000'
);

export const S3_FILE_PUBLIC_BUCKET = getEnvVar(
  'S3_FILE_PUBLIC_BUCKET',
  'publicupload'
);
export const S3_FILE_PUBLIC_ENDPOINT = getEnvVar(
  'S3_FILE_PUBLIC_ENDPOINT',
  'http://localhost:9000'
);
export const S3_FILE_PUBLIC_ENDPOINT_CDN = getEnvVar(
  'S3_FILE_PUBLIC_ENDPOINT_CDN',
  'http://localhost:9000/publicupload/'
);

export const S3_IMAGE_BUCKET = getEnvVar('S3_IMAGE_BUCKET', 'image');
export const S3_IMAGE_ENDPOINT = getEnvVar(
  'S3_IMAGE_ENDPOINT',
  'http://localhost:9000'
);
export const S3_IMAGE_ENDPOINT_CDN = getEnvVar(
  'S3_IMAGE_ENDPOINT_CDN',
  'http://localhost:9000/image/'
);
export const IMAGE_THUMBNAIL_SECRET = getEnvVar(
  'IMAGE_THUMBNAIL_SECRET',
  'somesecret'
);

export const AUTH_DEFAULT_REFRESH_TOKEN_LIFETIME = 60 * 60 * 24 * 30; // 30 days
export const AUTH_DEFAULT_ACCESS_TOKEN_LIFETIME = 60 * 15; // 15 min;

export const CORS_ORIGINS = getEnvVar(
  'CORS_ORIGINS',
  'http://localhost:3001,http://localhost:3000'
).split(',');

// Project URLs
export const PROJECT_ENDPOINT = getEnvVar(
  'PROJECT_ENDPOINT',
  'http://{alias}.dev.slicknode.local:30301'
); // 'http://localhost:3000/v1/{alias}'
export const PROJECT_ID = getEnvVar('PROJECT_ID', '') || null;

// Required tenant modules that are added on project creation
export const REQUIRED_TENANT_MODULES = ['core', 'auth', 'relay'];
