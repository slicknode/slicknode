/**
 * Created by Ivo Meißner on 2019-03-14
 *
 */
import { ModuleConfig } from '../definition';
import Context from './index';
import SchemaBuilder from '../schema/builder';
import httpMocks from 'node-mocks-http';
import { JWT_SECRET } from '../config';
import { ContextOptions } from './Context';

/**
 * Creates a context
 * @param modules
 * @param options
 */
export default function createContext(
  modules: Array<ModuleConfig>,
  options: Partial<ContextOptions> = {}
): Context {
  const schemaBuilder = new SchemaBuilder({ modules });
  const req = httpMocks.createRequest!({
    headers: {
      host: 'localhost:3000',
    },
  });

  const res = httpMocks.createResponse();

  // Add dummy translator
  res.__ = (text) => text;

  return new Context({
    ...options,
    res: options.res || res,
    req: options.req || req,
    jwtSecret: options.jwtSecret || JWT_SECRET,
    schemaBuilder: options.schemaBuilder || schemaBuilder,
  });
}
