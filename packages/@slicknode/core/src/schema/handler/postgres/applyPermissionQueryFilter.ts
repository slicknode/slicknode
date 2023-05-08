/**
 * Created by Ivo Meißner on 13.07.17.
 *
 */

import { ObjectTypeConfig } from '../../../definition';
import Context from '../../../context';
import toTableName from './toTableName';
import type { Knex } from 'knex';
import permissionQueryToFilter from '../../../auth/permissionQueryToFilter';
import applyQueryFilter from './applyQueryFilter';

import { queryFilteringRequired } from '../../../auth/utils';

import { Permission } from '../../../auth/type';

import { DEFAULT_PRIMARY_KEY } from './constants';

/**
 * Returns true if the filter spans multiple tables
 *
 * @param filter
 * @param typeConfig
 * @param context
 *
function isMultiTableFilter(filter: Object, typeConfig: ObjectTypeConfig, context: Context): boolean {
  const fieldNames = Object.keys(filter);
  const filteredFields = _.pick(typeConfig.fields, fieldNames);
  if (Object.keys(filteredFields).length !== fieldNames.length) {
    return true;
  }
  
  // Check if we are filtering on related object
  return Object.keys(filteredFields).some((name: string) => {
    const fieldConfig = filteredFields[name];
    const filteredTypeConfig = context.schemaBuilder.typeConfigs[fieldConfig.typeName];
    return (
      filteredTypeConfig &&
      filteredTypeConfig.kind === TypeKind.OBJECT &&
      filteredTypeConfig.interfaces.includes('Node') &&
      
      // If we are only filtering by ID, we don't need to join another level
      !(
        Object.keys(filter[name]).length === 1 &&
        filter[name][DEFAULT_PRIMARY_KEY]
      )
    );
  });
}

/**
 * Adds filtering to the query based on the permissions
 * @param params
 * @private
 */
export default function applyPermissionQueryFilter(params: {
  query: Knex.QueryBuilder;
  typeConfig: ObjectTypeConfig;
  permissions: Array<Permission> | undefined | null;
  tableName: string;
  getTableAlias: () => string;
  context: Context;
  preview: boolean;
}): Knex.QueryBuilder {
  const {
    query,
    typeConfig,
    permissions,
    tableName,
    getTableAlias,
    context,
    preview,
  } = params;

  if (queryFilteringRequired(permissions, context)) {
    const filterQueries = (permissions || [])
      .filter((permission: Permission) => {
        return permission.query && context.auth.roles.includes(permission.role);
      })
      .map((permission) => permission.query || '');

    // Deny access if we have no matching permission
    if (!filterQueries.length) {
      return query.whereRaw('FALSE');
    }

    // Apply all filters to query
    const permissionSchema = context.getPermissionSchema(typeConfig.name);
    const variables = {
      // eslint-disable-next-line
      user_id: context.auth.uid
        ? context.toGlobalId('User', context.auth.uid)
        : null,
    };
    const userType = context.schemaBuilder.getObjectTypeConfig('User');
    const userTable = toTableName(userType, context.getDBSchemaName());

    // Build permission filter condition
    query.where(function (fullCondition) {
      filterQueries.forEach((filterQuery: string) => {
        fullCondition.orWhere(function (partialCondition) {
          const filter = permissionQueryToFilter(
            filterQuery,
            permissionSchema,
            variables
          );

          // Filter nodes with the permission query
          if (filter.node) {
            partialCondition.where(function () {
              applyQueryFilter({
                query: this,
                filter: filter.node.filter || {},
                typeConfig,
                tableName,
                getTableAlias,
                context,
                noPermissionFilters: true,
                preview,
              });
            });
          }

          // Filter user criteria if exists
          if (filter.user) {
            partialCondition.whereExists(function () {
              const userTableAlias = getTableAlias();
              const userQuery = this.select(1)
                .from(userTable + ' AS ' + userTableAlias)
                .whereRaw(`?? = ?${context.auth.uid && '::bigint'}`, [
                  userTableAlias + '.' + DEFAULT_PRIMARY_KEY,
                  context.auth.uid,
                ]);
              applyQueryFilter({
                query: userQuery,
                filter: filter.user.filter || {},
                typeConfig: userType,
                tableName: userTableAlias,
                getTableAlias,
                context,
                noPermissionFilters: true,
                preview,
              });
            });
          }
        });
      });
    });
  }
  return query;
}
