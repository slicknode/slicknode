/**
 * Created by Ivo Meißner on 11.08.17.
 *
 * @flow
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import {promisify} from 'util';
import {
  IProjectConfig,
} from '../types';
import {
  PRIVATE_MODULE_NAME_REGEX,
} from './constants';
import ValidationError from './ValidationError';
const readFile = promisify(fs.readFile) as Function; // tslint:disable-line
import {
  buildASTSchema,
  buildSchema,
  Kind,
  parse, print, printSchema, validateSchema as graphqlValidateSchema,
} from 'graphql';
import {RenameRootFields, RenameTypes, transformSchema} from 'graphql-tools';
import _ from 'lodash';

async function validateSchema(projectDir: string, config: IProjectConfig): Promise<any> {
  try {
    const modulePaths = Object.keys(config.dependencies)
      .map((name) => {
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
      } catch (e) {
        return '';
      }

      // Read schema config
      let moduleConfig;
      try {
        const configFile = path.join(modulePath, 'slicknode.yml');
        const rawModuleConfig = await readFile(configFile, 'utf8');
        moduleConfig = yaml.safeLoad(rawModuleConfig);
      } catch (e) {
        moduleConfig = null;
      }

      // Parse partial schema, so we can display path to .graphql file
      if (rawModuleSchema) {
        try {
          // Parse to see if is valid GraphQL document
          parse(rawModuleSchema);

          // Add namespace to types / root fields if we have remote module
          if (_.get(moduleConfig, 'module.remote')) {
            return transformRemoteSchema(rawModuleSchema, _.get(moduleConfig, 'module.namespace'));
          }
        } catch (e) {
          throw new Error(`Could not parse GraphQL schema ${path.relative(projectDir, schemaFile)}: ${e.message}`);
        }
      }
      return rawModuleSchema;
    });
    const loadedSchemas = await Promise.all(promises);
    const rawSchema = loadedSchemas.join('\n');

    const ast = parse(rawSchema);
    const schema = buildASTSchema(ast);
    const errors = graphqlValidateSchema(schema);

    return errors.map((e) => new ValidationError(`Invalid schema: ${e.message}`));
  } catch (e) {
    return [ new ValidationError(`Invalid schema: ${e.toString()}`) ];
  }
}

/**
 * Transforms a remote schema from the original schema to namespaced version that is merged
 * into the other modules
 *
 * @param schema
 * @param namespace
 */
function transformRemoteSchema(schema: string, namespace: string | null): string {
  let transformedSchema = buildSchema(schema);
  transformedSchema = transformSchema(transformedSchema, [
    new RenameTypes(
      (name) => namespace ? `${namespace}_${name}` : name,
    ),
    new RenameRootFields(
      ((operation, name) => namespace ? `${namespace}_${name}` : name),
    ),
  ]);
  const rootTypeNames: string[] = [];
  if (transformedSchema.getMutationType()) {
    rootTypeNames.push(transformedSchema.getMutationType()!.name);
  }
  if (transformedSchema.getQueryType()) {
    rootTypeNames.push(transformedSchema.getQueryType()!.name);
  }
  // Once subscriptions are supported, do the same here...
  let transformedSchemaDoc = parse(printSchema(transformedSchema));

  // Add root types as type extensions
  transformedSchemaDoc = {
    ...transformedSchemaDoc,
    definitions: transformedSchemaDoc.definitions.map((definition) => {
      if (definition.kind === Kind.OBJECT_TYPE_DEFINITION && rootTypeNames.includes(definition.name.value)) {
        return {
          ...definition,
          kind: Kind.OBJECT_TYPE_EXTENSION,
        };
      }
      return definition;
    }),
  };

  return print(transformedSchemaDoc);
}

export default validateSchema;
