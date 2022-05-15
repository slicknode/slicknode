/**
 * Created by Ivo Meißner on 11.08.17.
 */

import fs from 'fs';
import yaml from 'js-yaml';
import * as path from 'path';
import { promisify } from 'util';
import { IProjectConfig } from '../types';
import { PRIVATE_MODULE_NAME_REGEX } from './constants';
import ValidationError from './ValidationError';
const readFile = promisify(fs.readFile) as Function; // tslint:disable-line
import {
  buildASTSchema,
  buildSchema,
  Kind,
  parse,
  print,
  printSchema,
  validateSchema as graphqlValidateSchema,
} from 'graphql';

import { RenameTypes, RenameRootFields, wrapSchema } from '@graphql-tools/wrap';
import * as _ from 'lodash';

async function validateSchema(
  projectDir: string,
  config: IProjectConfig
): Promise<any> {
  try {
    const modulePaths = Object.keys(config.dependencies).map((name) => {
      const version = config.dependencies[name];
      if (name.match(PRIVATE_MODULE_NAME_REGEX)) {
        return path.resolve(path.join(projectDir, version));
      }

      return path.join(projectDir, '.slicknode', 'cache', 'modules', name);
    });

    const promises = modulePaths.map(async (modulePath) => {
      let rawModuleSchema = '';
      const schemaFile = path.join(modulePath, 'schema.graphql');
      try {
        rawModuleSchema = await readFile(schemaFile, 'utf8');
      } catch (e: any) {
        return '';
      }

      // Read schema config
      let moduleConfig;
      try {
        const configFile = path.join(modulePath, 'slicknode.yml');
        const rawModuleConfig = await readFile(configFile, 'utf8');
        moduleConfig = yaml.safeLoad(rawModuleConfig);
      } catch (e: any) {
        moduleConfig = null;
      }

      // Parse partial schema, so we can display path to .graphql file
      if (rawModuleSchema) {
        try {
          // Parse to see if is valid GraphQL document
          parse(rawModuleSchema);

          // Add namespace to types / root fields if we have remote module
          if (_.get(moduleConfig, 'module.remote')) {
            return transformRemoteSchema(
              rawModuleSchema,
              _.get(moduleConfig, 'module.namespace')
            );
          }
        } catch (e: any) {
          throw new Error(
            `Could not parse GraphQL schema ${path.relative(
              projectDir,
              schemaFile
            )}: ${e.message}`
          );
        }
      }
      return rawModuleSchema;
    });
    const loadedSchemas = await Promise.all(promises);
    const rawSchema = loadedSchemas.join('\n');

    const ast = parse(rawSchema);
    const schema = buildASTSchema(ast);
    const errors = graphqlValidateSchema(schema);

    return errors.map(
      (e) => new ValidationError(`Invalid schema: ${e.message}`)
    );
  } catch (e: any) {
    return [new ValidationError(`Invalid schema: ${e.toString()}`)];
  }
}

/**
 * Transforms a remote schema from the original schema to namespaced version that is merged
 * into the other modules
 *
 * @param schema
 * @param namespace
 */
function transformRemoteSchema(
  schema: string,
  namespace: string | null
): string {
  const transformedSchema = wrapSchema({
    schema: buildSchema(schema),
    transforms: [
      new RenameTypes((name) => (namespace ? `${namespace}_${name}` : name)),
      new RenameRootFields((operation, name) =>
        namespace ? `${namespace}_${name}` : name
      ),
    ],
  });
  const rootTypeNames: string[] = [];
  const mutationType = transformedSchema.getMutationType();
  if (mutationType) {
    rootTypeNames.push(mutationType.name);
  }
  const queryType = transformedSchema.getQueryType();
  if (queryType) {
    rootTypeNames.push(queryType.name);
  }
  // Once subscriptions are supported, do the same here...
  let transformedSchemaDoc = parse(printSchema(transformedSchema));

  // Add root types as type extensions to Mutation + Query type
  transformedSchemaDoc = {
    ...transformedSchemaDoc,
    definitions: transformedSchemaDoc.definitions
      // Remove schema definition
      .filter(
        (definition) =>
          ![Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION].includes(
            definition.kind as any
          )
      )
      .map((definition) => {
        if (
          definition.kind === Kind.OBJECT_TYPE_DEFINITION &&
          rootTypeNames.includes(definition.name.value)
        ) {
          const typeName =
            definition.name.value === queryType?.name ? 'Query' : 'Mutation';
          return {
            ...definition,
            name: {
              ...definition.name,
              value: typeName,
            },
            kind: Kind.OBJECT_TYPE_EXTENSION,
          };
        }
        return definition;
      }),
  };

  return print(transformedSchemaDoc);
}

export default validateSchema;
