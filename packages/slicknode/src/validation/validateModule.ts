/**
 * Created by Ivo Meißner on 09.08.17.
 */

import { module as schema } from './configSchemas';
import ValidationError from './ValidationError';

export default async function validateModule(config: {
  [key: string]: any;
}): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  try {
    const result = schema.validate(config, {
      abortEarly: false,
    });
    if (result.error) {
      return (result.error.details || []).map((detail) => {
        return new ValidationError(
          `Invalid value at path "${detail.path}": ${detail.message}`
        );
      });
    }
  } catch (e: any) {
    errors.push(new ValidationError(e.message));
    return errors;
  }

  return errors;
}
