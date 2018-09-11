/**
 * Created by Ivo Meißner on 09.08.17.
 */

import Joi from 'joi';
import {module as schema} from './configSchemas';
import ValidationError from './ValidationError';

export default async function validateModule(config: {[key: string]: any}): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  try {
    const result = Joi.validate(config, schema, {
      abortEarly: false,
    });
    if (result.error) {
      return (result.error.details || []).map((detail) => {
        return new ValidationError(`Invalid value at path "${detail.path}": ${detail.message}`);
      });
    }
  } catch (e) {
    errors.push(new ValidationError(e.message));
    return errors;
  }

  return errors;
}
