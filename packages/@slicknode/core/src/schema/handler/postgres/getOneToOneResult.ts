/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import {
  ConnectionConfig,
  ConnectionLoaderArgs,
  isContent,
  isNode,
} from '../../../definition';

import { HANDLER_POSTGRES } from '../base';

import Context from '../../../context';

import _ from 'lodash';

import toTableName, { TableType } from './toTableName';
import PostgresHandler from './PostgresHandler';
import toColumnName from './toColumnName';
import applyPermissionQueryFilter from './applyPermissionQueryFilter';

import { DEFAULT_PRIMARY_KEY } from './constants';
import { getPgTypeName } from './fields/IDHandler';

/**
 * Returns the connection field resolve function for the given connection
 * @param loaderArgs
 * @param connectionConfig
 * @param context
 * @param preview
 * @param locale
 */
export default async function getOneToOneResult(
  loaderArgs: Array<ConnectionLoaderArgs>,
  connectionConfig: ConnectionConfig,
  context: Context,
  preview: boolean,
  locale: string | null
): Promise<any> {
  const nodeType = context.schemaBuilder.getObjectTypeConfig(
    connectionConfig.node.typeName
  );
  const db = context.getDBRead();
  const isContentNode = isContent(nodeType);

  // Table alias generator to prevent ambiguous table names within a single query
  let tableCount = 0;
  function getTableAlias(): string {
    tableCount++;
    return 't' + tableCount;
  }

  // We have edge type
  if (connectionConfig.edge.typeName) {
    // Check if we have Node
    if (!(nodeType.interfaces || []).includes('Node')) {
      throw new Error('1:1 Connection node has to implement Node interface');
    }

    const edgeType = context.schemaBuilder.getObjectTypeConfig(
      connectionConfig.edge.typeName
    );
    const isContentEdge = isContent(edgeType);

    // Check if we have Postgres handler
    if (nodeType.handler && nodeType.handler.kind === HANDLER_POSTGRES) {
      const edgeTable = toTableName(
        edgeType,
        context.getDBSchemaName(),
        isContentEdge && preview ? TableType.PREVIEW : TableType.DEFAULT
      );
      const nodeTable = toTableName(
        nodeType,
        context.getDBSchemaName(),
        isContentNode && preview ? TableType.PREVIEW : TableType.DEFAULT
      );

      const edgeCols = PostgresHandler._getAllColumnNames(
        connectionConfig.edge.typeName,
        context
      );
      const nodeCols = PostgresHandler._getAllColumnNames(
        connectionConfig.node.typeName,
        context
      );

      let query = db(edgeTable)
        .select([
          ...edgeCols.map((col) => edgeTable + '.' + col + ' as e_' + col),
          ...nodeCols.map((col) => nodeTable + '.' + col + ' as n_' + col),
        ])
        .whereIn(
          edgeTable + '.' + toColumnName(connectionConfig.edge.sourceField),
          loaderArgs.map(createValuePreparer(connectionConfig, context))
        )
        .innerJoin(
          nodeTable,
          edgeTable + '.' + toColumnName(connectionConfig.edge.nodeField),
          nodeTable +
            '.' +
            toColumnName(
              connectionConfig.node.keyField ||
                (isContentNode ? 'contentNode' : DEFAULT_PRIMARY_KEY)
            )
        );

      // Modulely permission filters
      query = applyPermissionQueryFilter({
        query,
        typeConfig: edgeType,
        permissions: edgeType.permissions,
        tableName: edgeTable,
        getTableAlias,
        context,
        preview,
      });
      query = applyPermissionQueryFilter({
        query,
        typeConfig: nodeType,
        permissions: nodeType.permissions,
        tableName: nodeTable,
        getTableAlias,
        context,
        preview,
      });

      const rows = await PostgresHandler.getBatchLoader(context).load(query);

      // Convert DB columns to edges
      const valueMap = rows.reduce(
        (
          map: {
            [x: string]: any;
          },
          row: {
            [x: string]: any;
          }
        ) => {
          // Convert rows to data objects
          const nodeData = {};
          const edgeData = {};
          _.forOwn(row, (val: any, name: string) => {
            if (name.startsWith('n_')) {
              nodeData[name.substr(2)] = val;
            } else {
              edgeData[name.substr(2)] = val;
            }
          });
          const node = PostgresHandler.convertDBResultData(
            nodeData,
            nodeType,
            context
          );
          const edge = PostgresHandler.convertDBResultData(
            edgeData,
            edgeType,
            context
          );
          map[String(edge[connectionConfig.edge.sourceField])] = node;
          return map;
        },
        {}
      );

      // Map original keys to values
      return loaderArgs.map((arg: ConnectionLoaderArgs) => {
        return valueMap[String(arg.sourceKeyValue)] || null;
      });
    }

    // @TODO: Implement if node is other handler type. First get IDs from edge type in batch and then
    // resolve node via context.getLoader()
    throw new Error(
      '1:1 Connection through edgeType to node with different handler is not supported at the moment'
    );
  } else {
    // Connection is defined through field on node

    // Check if handler is of type Postgres
    if (!nodeType.handler || nodeType.handler.kind !== HANDLER_POSTGRES) {
      throw new Error('Handler on node has to be of type postgres');
    }

    // Build query
    if (!connectionConfig.edge.sourceField) {
      throw new Error('SourceField is not defined in connection');
    }
    const tableName = toTableName(nodeType, context.getDBSchemaName());
    let query = db(tableName).whereIn(
      toColumnName(connectionConfig.edge.sourceField),
      loaderArgs.map(createValuePreparer(connectionConfig, context))
    );

    query = applyPermissionQueryFilter({
      query,
      typeConfig: nodeType,
      permissions: nodeType.permissions,
      tableName,
      getTableAlias,
      context,
      preview,
    });

    // Process results
    const rows = await PostgresHandler.getBatchLoader(context).load(query);

    // Map IDs to values
    const valueMap = rows.reduce(
      (
        map: {
          [x: string]: any;
        },
        row: {
          [x: string]: any;
        }
      ) => {
        const data = PostgresHandler.convertDBResultData(
          row,
          nodeType,
          context
        );
        map[String(data[connectionConfig.edge.sourceField])] = data;
        return map;
      },
      {}
    );

    // Map original keys to values
    return loaderArgs.map((arg: ConnectionLoaderArgs) => {
      return valueMap[String(arg.sourceKeyValue)] || null;
    });
  }
}

/**
 * Prepares connection loader arg value for DB input value, adds type casting to work with RDS Data API
 *
 * @param connectionConfig
 * @param context
 */
function createValuePreparer(
  connectionConfig: ConnectionConfig,
  context: Context
): (arg: ConnectionLoaderArgs) => any {
  // We have edge type
  const fieldName = connectionConfig.edge.sourceField;

  // Get type config for table that is queries
  const typeConfig = connectionConfig.edge.typeName
    ? context.schemaBuilder.getObjectTypeConfig(connectionConfig.edge.typeName)
    : context.schemaBuilder.getObjectTypeConfig(connectionConfig.node.typeName);

  const fieldConfig = typeConfig.fields[fieldName];
  const fieldType = context.schemaBuilder.typeConfigs[fieldConfig.typeName];

  // Get PG type
  let pgType: string;
  if (isContent(fieldType)) {
    pgType = 'uuid';
  } else if (isNode(fieldType)) {
    pgType = getPgTypeName(fieldType.fields.id);
  } else {
    switch (fieldConfig.typeName) {
      case 'Decimal':
        pgType = 'decimal';
        break;
    }
  }

  // Add casting in preparer
  if (pgType) {
    const db = context.getDBRead();
    return (arg) => {
      if (arg.sourceKeyValue === null) {
        return null;
      }
      return db.raw(`?::${pgType}`, [arg.sourceKeyValue]);
    };
  }

  return (arg) => {
    return arg.sourceKeyValue;
  };
}
