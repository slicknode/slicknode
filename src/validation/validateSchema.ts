/**
 * Created by Ivo Meißner on 11.08.17.
 *
 * @flow
 */

import {promisify} from 'es6-promisify';
import fs from 'fs';
import path from 'path';
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
  parse,
  validateSchema as graphqlValidateSchema,
} from 'graphql';

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

      // Parse partial schema, so we can display path to .graphql file
      if (rawModuleSchema) {
        try {
          parse(rawModuleSchema);
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

export default validateSchema;
