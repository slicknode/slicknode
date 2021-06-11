/**
 * Created by Ivo Meißner on 11.08.17.
 */
import fs, { PathLike } from 'fs';
import { parse } from 'graphql';
import yaml from 'js-yaml';
import path from 'path';
import { promisify } from 'util';
import validateModule from './validateModule';
import ValidationError from './ValidationError';

const readFile = promisify(fs.readFile) as Function; // tslint:disable-line

/**
 * Loads module configuration in the path and validates values
 * @param moduleDir
 * @returns {Promise.<void>}
 */
export default async function validateModulePath(
  moduleDir: string
): Promise<ValidationError[]> {
  const errors = [];

  // Read and validate slicknode.yml configuration
  try {
    const rawConfig = await readFile(
      path.join(moduleDir, 'slicknode.yml'),
      'utf8'
    );
    try {
      const config = yaml.safeLoad(rawConfig) as any;

      // Validate config file
      const childErrors = await validateModule(config);
      if (childErrors.length) {
        errors.push(
          new ValidationError(
            `Invalid configuration: ${moduleDir}/slicknode.yml`,
            {
              childErrors,
            }
          )
        );
      }
    } catch (e) {
      errors.push(
        new ValidationError(
          `Error parsing module config ${moduleDir}/slicknode.yml: ${e.message}`
        )
      );
    }
  } catch (e) {
    let message = e.message;

    // Add user friendly errors
    switch (e.code) {
      case 'ENOENT': {
        message = `No slicknode.yml file found in module directory: ${moduleDir}`;
        break;
      }
    }
    errors.push(new ValidationError(message));
  }

  // Read and validate schema
  try {
    const schemaPath = path.join(moduleDir, 'schema.graphql');
    const rawSchema = await readFile(schemaPath, 'utf8');
    try {
      // Check if document can be parsed
      parse(rawSchema);
    } catch (e) {
      // Ignore empty file parsing error
      if (
        !(
          e.message.includes('Unexpected <EOF>') &&
          e.locations &&
          e.locations.length &&
          e.locations[0].line === 1 &&
          e.locations[0].column === 1
        )
      ) {
        errors.push(
          new ValidationError(
            `Error parsing schema ${schemaPath}: ${e.message}`
          )
        );
      }
    }
  } catch (e) {
    let message = e.message;

    // Add user friendly errors
    switch (e.code) {
      case 'ENOENT': {
        message = `No schema.graphql file found in module directory: ${moduleDir}`;
        break;
      }
    }
    errors.push(new ValidationError(message));
  }

  // @TODO: Read and parse permission files

  return errors;
}
