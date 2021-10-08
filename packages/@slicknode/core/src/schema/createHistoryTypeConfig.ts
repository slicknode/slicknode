import { FieldConfigMap, isContent, ObjectTypeConfig } from '../definition';
import toTableName, { TableType } from './handler/postgres/toTableName';
import { getHistoryTypeName } from './identifiers';
import { Role } from '../auth';

/**
 * Generates a history type configuration for the provided type.
 * Removes unique constraints, custom indexes
 *
 * @param config
 */
export function createHistoryTypeConfig(
  config: ObjectTypeConfig
): ObjectTypeConfig {
  if (!isContent(config)) {
    throw new Error('Can only get history type config for ContentNode types');
  }
  const historyConfig: ObjectTypeConfig = {
    ...config,
    tableName: toTableName(config, null, TableType.HISTORY),
    interfaces: ['Node'],
    name: getHistoryTypeName(config.name),
    fields: Object.keys(config.fields).reduce(
      (fieldMap: FieldConfigMap, name) => {
        if (name === 'id') {
          fieldMap.id = config.fields.id;
        } else {
          fieldMap[name] = {
            ...config.fields[name],
            required: name === 'contentNode', // Everything can be NULL, to avoid cascading deletes
            unique: false, // No unique constraints
          };
        }
        return fieldMap;
      },
      {}
    ),
    indexes: [
      {
        fields: ['contentNode', 'locale'],
      },
    ],
    autoCompleteFields: undefined,
    // Change all Non-STAFF / ADMIN / RUNTIME permissions to STAFF
    permissions: (config.permissions || []).map((permission) => {
      if (![Role.STAFF, Role.ADMIN, Role.RUNTIME].includes(permission.role)) {
        return {
          ...permission,
          role: Role.STAFF,
        };
      } else {
        return permission;
      }
    }),

    // Do not create root types, no Query.node access
    directAccess: false,

    // We disable all mutations, can only be edited internally
    mutations: {},
  };
  return historyConfig;
}
