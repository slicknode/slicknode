/**
 * Created by Ivo Meißner on 12.10.17.
 *
 */

import { DirectiveLocationEnum, GraphQLDirective } from 'graphql';
import { baseModules } from '../../modules';
import SchemaBuilder from '../../schema/builder';

const directiveCache = new Map();

export function getDirective(
  name: string,
  location: DirectiveLocationEnum
): GraphQLDirective {
  const cacheKey = `${location}:${name}`;
  if (directiveCache.has(cacheKey)) {
    return directiveCache.get(cacheKey);
  }
  // Create instance of schema builder to create directives
  const schemaBuilder = new SchemaBuilder({ modules: baseModules });

  const directive = schemaBuilder.getDirective(name, location);
  directiveCache.set(cacheKey, directive);
  return directive;
}

// eslint-disable-next-line
export const RELATION_PATH_REGEX = /^([a-zA-Z0-9_]+)(\.[a-zA-Z0-9_]+)?(=([a-zA-Z0-9_]+)((\.[a-zA-Z0-9_]+){2}))?(=([a-zA-Z0-9_]+)(\.[a-zA-Z0-9_]+)?)$/;
