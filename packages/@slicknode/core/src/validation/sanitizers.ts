/**
 * Created by Ivo Meißner on 21.12.16.
 *
 */

import validator from 'validator';

/**
 * A function that sanitizes the input values for the specified field.
 * For example to remove trailing whitespace etc.
 *
 * Returns a new object with all values in sanitized form
 */
export function normalizeEmail(
  value: any,
  config: {
    [x: string]: any;
  } = {}
): any {
  /* eslint-disable camelcase */
  const options = {
    gmail_remove_subaddress: false,
    gmail_convert_googlemaildotcom: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
    ...config,
  };
  /* eslint-enable camelcase */
  return validator.normalizeEmail(value, options);
}

/**
 * Trims whitespace from both ends of the input value
 *
 * @param value
 * @returns {string|*}
 */
export function trim(value: any): any {
  return validator.trim(value);
}
