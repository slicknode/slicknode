/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */

import { ModuleConfig, ModuleSettingsMap } from '../../definition';
import SchemaBuilder from '../../schema/builder';
import httpMocks from 'node-mocks-http';
import knex from 'knex';

import Context from '../../context';
import { JWT_SECRET } from '../../config';
import { ContextOptions } from '../../context/Context';

interface ContextMockOptions extends ContextOptions {
  moduleSettings?: ModuleSettingsMap;
}

/**
 * Creates a mock context for the given modules
 * @param modules
 */
export default function createContextMock(
  modules: Array<ModuleConfig>
): Context {
  const schemaBuilder = new SchemaBuilder({ modules });
  return createContextMockFromSchemaBuilder(schemaBuilder);
}

/**
 * Creates a context from a schema builder
 * @param schemaBuilder
 * @param options
 */
export function createContextMockFromSchemaBuilder(
  schemaBuilder: SchemaBuilder,
  options: Partial<ContextMockOptions> = {}
): Context {
  const req = httpMocks.createRequest!({
    headers: {
      host: 'localhost:3000',
    },
  });
  const res = httpMocks.createResponse();

  // Add dummy translator
  res.__ = (text) => text;

  const context = new Context({
    res,
    req,
    jwtSecret: JWT_SECRET,
    schemaBuilder,
    ...(options as ContextOptions),
  });
  const db = knex({ client: 'pg' });
  context.setDBWrite(db);
  return context;
}
