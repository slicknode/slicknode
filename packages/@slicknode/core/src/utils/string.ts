/**
 * Created by Ivo Meißner on 26.04.17.
 *
 */
import { createHash } from 'crypto';
import pluralize from 'pluralize';

/**
 * Transforms a camelCaseString to a single words
 *
 * @param str
 * @returns {string}
 */
export function unCamelCase(str: string): string {
  return (
    str
      // insert a space between lower & upper
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // space before last upper in a sequence followed by lower
      .replace(/\b([A-Z]+)([A-Z])([a-z])/, '$1 $2$3')
      // uppercase the first character
      .replace(/^./, function (s) {
        return s.toUpperCase();
      })
  );
}

/**
 * Pluralizes a GraphQL type name to be a human readable label
 *
 * @param name
 * @returns {string}
 */
export function pluralizeTypeName(name: string): string {
  // Remove namespace
  const words = unCamelCase(name.split('_').pop()).split(' ');
  const lastWord = pluralize(words.pop());
  return words.join(' ') + ' ' + lastWord;
}

/**
 * Turns the SCREAMING_SNAKE_CASE into something readable
 * @param name
 */
export function unScreamSnakeCase(name: string): string {
  return name
    .split('_')
    .map((part) => part.toLowerCase().replace(/^./, (s) => s.toUpperCase()))
    .join(' ');
}

export type Base64String = string;

/**
 * Base64 encodes a string
 * @param i
 */
export function base64(i: string): Base64String {
  return Buffer.from(i, 'utf8').toString('base64');
}

/**
 * Returns a decoded base64 string
 * @param i
 */
export function unbase64(i: Base64String): string {
  return Buffer.from(i, 'base64').toString('utf8');
}

/**
 * Generates a random string to be used for passwords etc.
 * @param length
 */
export function randomString(length: number): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

/**
 * Returns an MD5 hash of the provided string
 * @param value
 */
export function md5Hash(value: string): string {
  return createHash('md5').update(value).digest('hex');
}
