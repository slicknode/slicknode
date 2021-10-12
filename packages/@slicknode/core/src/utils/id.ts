import { base64, unbase64 } from './string';
import trim from 'lodash/trim';

/**
 * Transforms global ID to local ID / type
 * @param id
 * @returns
 */
export function fromGlobalId(id: string): { type: string; id: string } {
  const parts = unbase64(id).split(':');
  return {
    type: parts.shift(),
    id: parts.join(':'),
  };
}

/**
 * Creates a global ID from type name, local ID
 * @param type
 * @param id
 */
export function toGlobalId(type: string, id: string): string {
  return trim(base64(`${type}:${id}`), '=');
}
