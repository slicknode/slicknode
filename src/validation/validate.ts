/**
 * Created by Ivo Meißner on 08.08.17.
 */

import path from 'path';
import { IProjectConfig } from '../types';
import { PRIVATE_MODULE_NAME_REGEX } from './constants';
import validateConfig from './validateConfig';
import validateModulePath from './validateModulePath';
import validateSchema from './validateSchema';
import ValidationError from './ValidationError';

// $FlowFixMe: Does not recognize the filtering of NULL values
async function validate(
  projectDir: string,
  config: { [key: string]: any }
): Promise<ValidationError[]> {
  if (!config) {
    return [new ValidationError('The directory is not a slicknode project')];
  }

  const configErrors = await validateConfig(config);
  if (configErrors.length) {
    return configErrors;
  }
  const validatedConfig = config as IProjectConfig;

  // Get paths of private modules
  const localModules = Object.keys(validatedConfig.dependencies).filter(
    (name) => name.match(PRIVATE_MODULE_NAME_REGEX)
  );

  // Run module validations asynchronously in parallel
  let moduleErrors = await Promise.all(
    localModules.map(async (name) => {
      const childErrors = await validateModulePath(
        path.join(projectDir, validatedConfig.dependencies[name])
      );
      if (childErrors.length) {
        return new ValidationError(`Errors in module "${name}":`, {
          childErrors,
        });
      }
    })
  );
  // Ignore empty errors
  moduleErrors = moduleErrors.filter((err) => err);

  // Merge all modules and build schema
  let schemaErrors = [];
  if (!moduleErrors.length) {
    schemaErrors = await validateSchema(projectDir, validatedConfig);
  }

  return [...schemaErrors, ...moduleErrors];
}

export default validate;
