/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */
import fs from 'fs';
import Joi from 'joi';
import path from 'path';

/**
 * Validates if the provided path is a directory
 *
 * @param value
 * @returns {any}
 */
export function isDirectory(value: any) {
  const stats = fs.lstatSync(path.resolve(value));
  if (!stats || !stats.isDirectory()) {
    throw new Error('Value is not a valid directory');
  }

  return value;
}

/**
 * Validates if the value is a valid HTTP or HTTPS URL
 *
 * @param value
 * @returns {*}
 */
export function isUrl(value: any): string | null {
  let validatedValue = null;
  const schema = Joi.string().uri({
    scheme: [
      'http',
      'https',
    ],
  });

  Joi.validate(value, schema, (err, result) => {
    if (err) {
      throw new Error('Value is not a valid URL');
    }
    validatedValue = result;
  });

  return validatedValue;
}
