/**
 * Created by Ivo Meißner on 10.08.17.
 *
 * @flow
 */

import Joi, { ValidationResult } from 'joi';
import * as _ from 'lodash';
import * as path from 'path';
import ValidationError from './ValidationError';

import { IProjectConfig } from '../types';
import { slicknode as schema } from './configSchemas';
import { PRIVATE_MODULE_NAME_REGEX } from './constants';

async function validate(
  config: { [key: string]: any } | null
): Promise<ValidationError[]> {
  const errors = [];
  try {
    const result = schema.validate(config, {
      abortEarly: false,
    });
    if (result.error) {
      const childErrors = (result.error.details || []).map((detail) => {
        return new ValidationError(
          `Invalid value at path "${detail.path}": ${detail.message}`
        );
      });
      errors.push(
        new ValidationError('Invalid values in slicknode.yml configuration', {
          childErrors,
        })
      );
      return errors;
    }

    // Check for duplicate paths
    const modulePaths = Object.keys(result.value.dependencies).map((name) => {
      const version = result.value.dependencies[name];
      if (name.match(PRIVATE_MODULE_NAME_REGEX)) {
        return path.resolve(version);
      }

      return path.join('.slicknode', 'cache', name);
    });

    const duplicates = modulePaths.filter((p, index) =>
      modulePaths.includes(p, index + 1)
    );
    if (duplicates.length) {
      errors.push(
        new ValidationError(
          `Multiple modules in slicknode.yml point to the same paths: \n\n${_.uniq(
            duplicates
          ).join('\n')}`
        )
      );
    }
  } catch (e) {
    errors.push(new ValidationError(e.message));
    return errors;
  }

  return errors;
}

export default validate;
