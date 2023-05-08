/**
 * Created by Ivo Meißner on 13.07.17.
 *
 */

import {
  ObjectTypeConfig,
  FieldConfig,
  ConnectionConfig,
  ConnectionConfigMap,
} from '../../../definition';

import Context from '../../../context';
import toColumnName from './toColumnName';
import toTableName from './toTableName';
import type { Knex } from 'knex';
import PostgresHandler from './PostgresHandler';
import { DEFAULT_PRIMARY_KEY } from './constants';
import _ from 'lodash';
import { HANDLER_POSTGRES } from '../base';
import applyPermissionQueryFilter from './applyPermissionQueryFilter';
import { ID } from './fields';
import { UserError } from '../../../errors';
import { Permission } from '../../../auth';
import { addNodeToSurrogateCache } from '../../../cache/surrogate/utils';

/**
 * Adds the query filter to the given query for the typeConfig
 *
 * @param params
 * @returns {QueryBuilder}
 * @private
 */
export default function applyQueryFilter(params: {
  query: Knex.QueryBuilder;
  filter: {
    [x: string]: any;
  };
  typeConfig: ObjectTypeConfig;
  tableName: string;
  getTableAlias: () => string;
  context: Context;
  noPermissionFilters?: boolean;
  preview: boolean;
}): Knex.QueryBuilder {
  const {
    query,
    filter,
    typeConfig,
    tableName,
    getTableAlias,
    context,
    noPermissionFilters,
    preview,
  } = params;

  const filteredFields = _.keys(filter);
  if (filteredFields.length) {
    let qb = query;
    _.forOwn(filter, (filterValue: any, fieldName: string) => {
      // Get FieldConfig from type
      if (!typeConfig.fields.hasOwnProperty(fieldName)) {
        // Add AND filter
        if (['AND', 'OR'].includes(fieldName)) {
          // Make sure sub-filters are not used with other filters
          if (filteredFields.length !== 1) {
            throw new UserError(
              `The filter "${fieldName}" cannot be used together with other filters: "${filteredFields
                .filter((tmpName) => tmpName !== fieldName)
                .join('", "')}"`
            );
          }

          // Ignore if we have NULL value
          if (!filterValue) {
            return;
          }

          // Create sub-filters
          const subFilters = filterValue.map(
            (innerFilter) => (innerQueryBuilder) => {
              applyQueryFilter({
                query: innerQueryBuilder,
                filter: innerFilter,
                typeConfig,
                tableName,
                getTableAlias,
                context,
                noPermissionFilters,
                preview,
              });
            }
          );
          if (fieldName === 'AND') {
            subFilters.forEach((subFilter) => qb.andWhere(subFilter));
          } else if (fieldName === 'OR') {
            qb.andWhere((innerQueryBuilder) => {
              subFilters.forEach((subFilter) =>
                innerQueryBuilder.orWhere(subFilter)
              );
            });
          }
          return;
        }

        // Check if is autoComplete query and apply autocomplete query
        if (
          typeConfig.autoCompleteFields &&
          fieldName === '_autocomplete' &&
          typeConfig.autoCompleteFields.length
        ) {
          const columnNames = typeConfig.autoCompleteFields.map((name) =>
            toColumnName(name)
          );

          qb.whereRaw(
            `${PostgresHandler._getAutoCompleteQueryField(
              columnNames
            )} ILIKE ?`,
            [...columnNames, `%${String(filterValue).replace(/%/g, '\\%')}%`]
          );
          return;
        }

        // Check if we have connection filtering
        const connectionMap: ConnectionConfigMap =
          context.schemaBuilder.connectionConfigs[typeConfig.name] || {};
        if (connectionMap.hasOwnProperty(fieldName)) {
          const connectionConfig: ConnectionConfig = connectionMap[fieldName];
          const nodeTypeConfig = context.schemaBuilder.getObjectTypeConfig(
            connectionConfig.node.typeName
          );
          const nodeTable = toTableName(
            nodeTypeConfig,
            context.getDBSchemaName()
          );
          const nodeTableAlias = getTableAlias();

          // Add node type to surrogate cache tags
          if (context.surrogateCache) {
            addNodeToSurrogateCache({
              context,
              typeConfig: nodeTypeConfig,
              preview,
              node: null,
            });
          }

          if (!connectionConfig.edge.sourceField) {
            throw new Error(
              'No source field specified on edge in connection config'
            );
          }

          // Check if edge connection is stored in separate type
          if (connectionConfig.edge.typeName) {
            if (!connectionConfig.edge.nodeField) {
              throw new Error(
                'No nodeField specified on edge in connection config'
              );
            }

            // Get edge TypeConfig
            const edgeTypeConfig = context.schemaBuilder.getObjectTypeConfig(
              connectionConfig.edge.typeName
            );

            // Check if node has Postgres handler configured
            const typeHandler = nodeTypeConfig.handler;
            if (!typeHandler || typeHandler.kind !== HANDLER_POSTGRES) {
              throw new Error(
                'n:m connection between different handlers not supported at the moment'
              );
            }

            // Add edge type to surrogate cache tags
            if (context.surrogateCache) {
              addNodeToSurrogateCache({
                context,
                typeConfig: edgeTypeConfig,
                preview,
                node: null,
              });
            }

            const edgeTable = toTableName(
              edgeTypeConfig,
              context.getDBSchemaName()
            );
            const edgeTableAlias = getTableAlias();

            // Build filter query on connected nodes via edge type
            qb = qb.whereExists(function () {
              let subQb = this.select(
                edgeTableAlias + '.' + DEFAULT_PRIMARY_KEY
              )
                .from(edgeTable + ' AS ' + edgeTableAlias)
                // @TODO: If we filter on keyField of node only we don't need to join the node table
                // and can filter directly on edge type
                .innerJoin(
                  nodeTable + ' AS ' + nodeTableAlias,

                  edgeTableAlias +
                    '.' +
                    toColumnName(connectionConfig.edge.nodeField),
                  nodeTableAlias +
                    '.' +
                    toColumnName(
                      connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY
                    )
                )
                .whereRaw('?? = ??', [
                  edgeTableAlias +
                    '.' +
                    toColumnName(connectionConfig.edge.sourceField),
                  tableName +
                    '.' +
                    toColumnName(
                      connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
                    ),
                ]);

              // Add permission filters
              if (!noPermissionFilters) {
                // Filter node
                subQb = applyPermissionQueryFilter({
                  query: subQb,
                  typeConfig: nodeTypeConfig,
                  permissions: nodeTypeConfig.permissions,
                  tableName: nodeTableAlias,
                  getTableAlias,
                  context,
                  preview,
                });
                // Filter edge
                subQb = applyPermissionQueryFilter({
                  query: subQb,
                  typeConfig: edgeTypeConfig,
                  permissions: edgeTypeConfig.permissions,
                  tableName: edgeTableAlias,
                  getTableAlias,
                  context,
                  preview,
                });
              }

              // Add query filters
              if (filterValue && filterValue.node) {
                // If we only filter by ID, we don't have to a JOIN on node table and filter on
                // edge type directly
                if (
                  Object.keys(filterValue.node).length === 1 &&
                  filterValue.node['id']
                ) {
                  // Apply ID filter on nodeField of edge type
                  ID.applyQueryFilter(
                    subQb,

                    connectionConfig.edge.nodeField,
                    nodeTypeConfig.fields.id,
                    edgeTableAlias,
                    filterValue.node['id'],
                    getTableAlias,
                    context,
                    preview
                  );
                } else {
                  // Get new node table alias for next hop
                  /*
                  subQb.innerJoin(
                    nodeTable + ' AS ' + nodeTableAlias,
                    
                    edgeTableAlias + '.' + toColumnName(connectionConfig.edge.nodeField),
                    nodeTableAlias + '.' + toColumnName(connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY)
                  );
                  */
                  applyQueryFilter({
                    query: subQb,
                    filter: filterValue.node,
                    typeConfig: nodeTypeConfig,
                    tableName: nodeTableAlias,
                    getTableAlias,
                    context,
                    noPermissionFilters,
                    preview,
                  });
                }
              }
            });
          } else {
            // Build filter query on connected nodes that have reference stored in own table
            qb = qb.whereExists(function () {
              let subQb = this.select(
                nodeTableAlias + '.' + DEFAULT_PRIMARY_KEY
              )
                .from(nodeTable + ' AS ' + nodeTableAlias)
                .whereRaw('?? = ??', [
                  nodeTableAlias +
                    '.' +
                    toColumnName(connectionConfig.edge.sourceField),
                  tableName +
                    '.' +
                    toColumnName(
                      connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
                    ),
                ]);

              // Add permission filtering
              if (!noPermissionFilters) {
                subQb = applyPermissionQueryFilter({
                  query: subQb,
                  typeConfig: nodeTypeConfig,
                  permissions: nodeTypeConfig.permissions,
                  tableName: nodeTableAlias,
                  getTableAlias,
                  context,
                  preview,
                });
              }

              // Add query filters
              if (filterValue && filterValue.node) {
                applyQueryFilter({
                  query: subQb,
                  filter: filterValue.node,
                  typeConfig: nodeTypeConfig,
                  tableName: nodeTableAlias,
                  getTableAlias,
                  context,
                  noPermissionFilters,
                  preview,
                });
              }
            });
          }

          return;
        }

        throw new Error(
          'Field or connection config not found for filter on field ' +
            fieldName
        );
      }

      // We have a field on type, use field handler for filtering
      const fieldConfig: FieldConfig = typeConfig.fields[fieldName];
      const handler = PostgresHandler.getFieldHandlerFromContext(
        fieldConfig,
        context
      );
      qb = handler.applyQueryFilter(
        qb,
        fieldName,
        fieldConfig,
        tableName,
        filterValue,
        getTableAlias,
        context,
        noPermissionFilters,
        preview
      );
    });
    return qb;
  }
  return query;
}
