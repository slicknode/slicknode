/**
 * Created by Ivo Meißner on 04.03.17.
 *
 */

import { OperationType } from '../auth/type';

export const RESERVED_FIELD_NAMES = [
  'node', // Would shadow field on edge type in connections
  'cursor', // Would shadow field on edge type in connections
];

/**
 * Returns the mutation name for the action
 * @param typeName
 * @param type
 */
export function getMutationName(typeName: string, type: OperationType): string {
  const verbs = {
    DELETE: 'delete',
    CREATE: 'create',
    UPDATE: 'update',
    PUBLISH: 'publish',
    UNPUBLISH: 'unpublish',
  };
  if (!verbs.hasOwnProperty(type)) {
    throw new Error('Invalid mutation type provided');
  }
  const verb = verbs[type];

  const nameParts = typeName.split('_');
  const partialTypeName = nameParts[nameParts.length - 1];
  const namespace =
    nameParts.length > 1
      ? nameParts.slice(0, nameParts.length - 1).join('_') + '_'
      : '';

  return (
    namespace +
    verb +
    partialTypeName.charAt(0).toUpperCase() +
    partialTypeName.slice(1)
  );
}

/**
 * Returns the list all connection field name for the type
 * @param typeName
 * @returns {string}
 */
export function getListAllConnectionName(typeName: string): string {
  // Determine namespace and typename
  const nameParts = typeName.split('_');
  const localTypeName = nameParts[nameParts.length - 1];
  const namespace =
    nameParts.length > 1
      ? nameParts.slice(0, nameParts.length - 1).join('_') + '_'
      : '';

  return (
    namespace +
    'list' +
    localTypeName.charAt(0).toUpperCase() +
    localTypeName.slice(1)
  );
}

/**
 * Returns the history type name
 * @param typeName
 */
export function getHistoryTypeName(typeName: string): string {
  return `${typeName}_Version`;
}

/**
 * Returns the filter name for the type
 * @param typeName
 */
export function getTypeFilterName(typeName: string): string {
  return `_${typeName}Filter`;
}
