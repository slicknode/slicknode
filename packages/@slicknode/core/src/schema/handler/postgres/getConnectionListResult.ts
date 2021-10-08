/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import {
  assertObjectTypeConfig,
  ConnectionConfig,
  isContent,
  isNode,
  ObjectTypeConfig,
  TypeKind,
} from '../../../definition';

import { HANDLER_POSTGRES } from '../base';

import Context from '../../../context';

import {
  CONNECTION_NODES_DEFAULT,
  CONNECTION_NODES_MAX,
} from '../../../config';

import _ from 'lodash';
import { ValidationError } from '../../../errors';

import toTableName, { TableType } from './toTableName';
import PostgresHandler from './PostgresHandler';
import toColumnName from './toColumnName';

import { DEFAULT_PRIMARY_KEY } from './constants';
import applyQueryFilter from './applyQueryFilter';
import applyPermissionQueryFilter from './applyPermissionQueryFilter';
import Knex, { QueryBuilder } from 'knex';
import { getPgTypeName } from './fields/IDHandler';

/**
 * Returns the connection field resolve function for the given connection
 * @param sourceKeyValues
 * @param connectionConfig
 * @param args
 * @param context
 * @param preview
 * @param locale
 */
export default function getConnectionListResult(
  sourceKeyValues: any[],
  connectionConfig: ConnectionConfig,
  args: {
    [x: string]: any;
  },
  context: Context,
  preview: boolean,
  locale: string | null
): Promise<any> {
  return new Promise((resolve, reject) => {
    const db = context.getDBRead();
    let query = null;
    const nodeTypeConfig = context.schemaBuilder.getObjectTypeConfig(
      connectionConfig.node.typeName
    );
    const nodeCols = PostgresHandler._getAllColumnNames(
      connectionConfig.node.typeName,
      context
    );
    const isNodeContent = isContent(nodeTypeConfig);

    // Check pagination direction
    let directionForward = true;
    let limit = _.get(args, 'first', CONNECTION_NODES_DEFAULT);
    if (args.before || args.last) {
      directionForward = false;
      limit = _.get(args, 'last', CONNECTION_NODES_DEFAULT);
    }

    // Apply max limit
    limit = Math.min(limit, CONNECTION_NODES_MAX);

    // Check if we have mixed offset and cursor based pagination
    if (args.skip < 0) {
      throw new ValidationError(
        'Invalid input argument: Skip has to be a positive number'
      );
    } else if (args.skip && (args.last || args.before || args.after)) {
      throw new ValidationError(
        'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
      );
    }

    // Check if edge connection is stored in separate type
    if (connectionConfig.edge.typeName) {
      if (!connectionConfig.edge.sourceField) {
        throw new Error(
          'No source field specified on edge in connection config'
        );
      }
      if (!connectionConfig.edge.nodeField) {
        throw new Error('No nodeField specified on edge in connection config');
      }

      // Get edge TypeConfig
      const edgeTypeConfig = context.schemaBuilder.getObjectTypeConfig(
        connectionConfig.edge.typeName
      );
      const isEdgeContent = isContent(edgeTypeConfig);

      // Check if node has Postgres handler configured
      const typeHandler = nodeTypeConfig.handler;
      if (!typeHandler || typeHandler.kind !== HANDLER_POSTGRES) {
        throw new Error(
          'n:m connection between different handlers not supported at the moment'
        );
      }

      const edgeTable = toTableName(
        edgeTypeConfig,
        context.getDBSchemaName(),
        preview && isEdgeContent ? TableType.PREVIEW : TableType.DEFAULT
      );
      const nodeTable = toTableName(
        nodeTypeConfig,
        context.getDBSchemaName(),
        preview && isNodeContent ? TableType.PREVIEW : TableType.DEFAULT
      );

      const edgeCols = PostgresHandler._getAllColumnNames(
        connectionConfig.edge.typeName,
        context
      );

      query = db(edgeTable)
        .select([
          ...edgeCols.map((col) => edgeTable + '.' + col + ' as e_' + col),
          ...nodeCols.map((col) => nodeTable + '.' + col + ' as n_' + col),
        ])
        /*
        .where(
          
          edgeTable + '.' + toColumnName(connectionConfig.edge.sourceField),
          '=',
          typeof sourceKeyValue === 'undefined' ? null : sourceKeyValue
        )
         */
        .innerJoin(
          nodeTable,

          edgeTable + '.' + toColumnName(connectionConfig.edge.nodeField),
          nodeTable +
            '.' +
            toColumnName(
              connectionConfig.node.keyField ||
                (isNodeContent ? 'contentNode' : DEFAULT_PRIMARY_KEY)
            )
        );
      // Return empty query if sourceKeyValue is undefined#
      /*
      if (typeof sourceKeyValue === 'undefined') {
        query.whereRaw('FALSE');
      }
       */

      // Add locale filtering
      if (locale && isNodeContent) {
        query = query.whereRaw(`?? = (select ?? from ?? where ?? = ?)`, [
          toColumnName('locale'),
          toColumnName(DEFAULT_PRIMARY_KEY),
          toTableName(
            context.schemaBuilder.getObjectTypeConfig('Locale'),
            context.getDBSchemaName()
          ),
          toColumnName('code'),
          locale,
        ]);
      }

      // Function to generate filter table alias, they have to be unique across a whole query and
      // any number of query filter branches
      let filterAliasCount = 0;
      const getFilterAlias = (): string => {
        filterAliasCount++;
        return `_f${filterAliasCount}`;
      };

      // Add query filters
      if (args.filter && args.filter.node) {
        query = applyQueryFilter({
          query,
          filter: args.filter.node,
          typeConfig: nodeTypeConfig,
          tableName: nodeTable,
          getTableAlias: getFilterAlias,
          context,
          noPermissionFilters: false,
          preview,
        });
      }

      // Add permission filters
      query = applyPermissionQueryFilter({
        query,
        typeConfig: nodeTypeConfig,
        permissions: nodeTypeConfig.permissions,
        tableName: nodeTable,
        getTableAlias: getFilterAlias,
        context,
        preview,
      });
      query = applyPermissionQueryFilter({
        query,
        typeConfig: edgeTypeConfig,
        permissions: edgeTypeConfig.permissions,
        tableName: edgeTable,
        getTableAlias: getFilterAlias,
        context,
        preview,
      });

      // Set sorting order
      let orderFields = [DEFAULT_PRIMARY_KEY];
      const reverse =
        Boolean(args) &&
        Boolean(args.orderBy) &&
        args.orderBy.direction === 'DESC';
      if (args.orderBy && args.orderBy.fields) {
        orderFields = args.orderBy.fields;
        // Check if order fields already contains ID, if not, append ID for cursor pagination
        if (!orderFields.includes(DEFAULT_PRIMARY_KEY)) {
          orderFields.push(DEFAULT_PRIMARY_KEY);
        }
      }
      // Convert fields to column names and construct raw query
      const orderFieldQuery = `(${orderFields
        .map(
          (field) =>
            `"${nodeTable.split('.').join('"."')}"."${toColumnName(field)}"`
        )
        .join(', ')})`;
      const direction = directionForward === !reverse ? 'asc' : 'desc';
      query = query.orderByRaw(`${orderFieldQuery} ${direction}`);

      // Get PG type to build sourceKeyValue table
      const pgTypeName = getPostgresType({
        fieldName: connectionConfig.edge.sourceField,
        typeName: connectionConfig.edge.typeName,
        context,
      });

      // Create the batch loader before we prepare the loader to further manipulate the query object
      const totalCountBatchLoader = createTotalCountBatchLoader({
        query,
        sourceKeyColumn: `${edgeTable}.${toColumnName(
          connectionConfig.edge.sourceField
        )}`,
        sourceKeyValues,
        context,
        db,
        sourceKeyPgTypeName: pgTypeName,
      });

      // Apply limit, we get one more to determine page info "hasNextPage", "hasPreviousPage"
      query = query.limit(limit + 1);

      // Apply offset if we have "skip" value
      if (args.skip > 0) {
        query.offset(args.skip);
      }

      // We are paginating starting at a cursor position
      if (args.after || args.before) {
        let cursor;
        let operator;
        // Set cursor and operator for forward pagination
        if (directionForward) {
          operator = !reverse ? '>' : '<';
          cursor = args.after;
        } else {
          operator = reverse ? '>' : '<';
          cursor = args.before;
        }

        // We just sort by ID if first order is primary key
        const nodeIdPgType = getPgTypeName(nodeTypeConfig.fields.id);
        if (orderFields[0] === DEFAULT_PRIMARY_KEY) {
          query = query.whereRaw(`?? ${operator} ?::${nodeIdPgType}`, [
            `${nodeTable}.${DEFAULT_PRIMARY_KEY}`,
            cursor,
          ]);
        } else {
          // We get the record from cursor position and filter accordingly
          const cursorValues = orderFields
            .map((field) => {
              return `"ord"."${toColumnName(field)}" "o_${toColumnName(
                field
              )}"`;
            })
            .join(', ');
          query = query.whereRaw(
            `${orderFieldQuery} ${operator} (SELECT ${cursorValues} from ?? ord WHERE id = ?::${nodeIdPgType})`,
            [nodeTable, cursor]
          );
        }
      }

      // Join to the list of keys
      const joinedQuery = query
        .where(
          '_keys._key',
          '=',
          db.raw('??', [
            `${edgeTable}.${toColumnName(connectionConfig.edge.sourceField)}`,
          ])
        )
        // Filter lists where key is NULL (sourceKeyValue is undefined)
        .whereNotNull('_keys._key');
      const joinedQuerySQL = joinedQuery.toSQL();
      const batchQuery = db
        .select(
          '_keys._key',
          db
            .select(db.raw('json_agg(d) as data'))
            .from(
              db.raw(`(${joinedQuerySQL.sql}) as d`, joinedQuerySQL.bindings)
            )
            .as('data')
        )
        .from(
          db
            .select(
              db.raw(`unnest(?::${pgTypeName}[]) as _key`, [
                sourceKeyValues.map((value) =>
                  value === undefined ? null : value
                ),
              ])
            )
            .as('_keys')
        );

      PostgresHandler.getBatchLoader(context)
        .load(batchQuery)
        .then((combinedRows) => {
          const connectionResults = combinedRows.map(({ data }, index) => {
            // Convert DB columns to edges
            const edges = (data || []).map((row) => {
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
                nodeTypeConfig,
                context
              );
              return {
                ...PostgresHandler.convertDBResultData(
                  edgeData,
                  edgeTypeConfig,
                  context
                ),
                node,
                cursor: PostgresHandler._getCursorForNode(
                  node,
                  args,
                  connectionConfig
                ),
              };
            });

            // Remove the edge that we retrieved to determine PageInfo
            const resultingEdges = edges.slice(0, limit);
            if (!directionForward) {
              // Flip direction for backward pagination
              resultingEdges.reverse();
            }

            // Resolve field
            return {
              pageInfo: {
                hasNextPage: directionForward ? edges.length > limit : false,
                hasPreviousPage: directionForward
                  ? false
                  : edges.length > limit,
                startCursor: resultingEdges.length
                  ? resultingEdges[0].cursor
                  : null,
                endCursor: resultingEdges.length
                  ? resultingEdges[resultingEdges.length - 1].cursor
                  : null,
              },
              edges: resultingEdges,
              // @TODO: This should be optimized together with aggregate functionality
              totalCount: createTotalCountLoader(totalCountBatchLoader, index),
            };
          });

          resolve(connectionResults);
        })
        .catch((error) => reject(error));
    } else {
      // Connection is stored inline in table
      const nodeTable = toTableName(
        nodeTypeConfig,
        context.getDBSchemaName(),
        preview && isNodeContent ? TableType.PREVIEW : TableType.DEFAULT
      );
      query = db(nodeTable).select([
        ...nodeCols.map((col) => nodeTable + '.' + col + ' as n_' + col),
      ]);

      // Add locale filtering
      if (locale && isNodeContent) {
        query = query.whereRaw(`?? = (select ?? from ?? where ?? = ?)`, [
          toColumnName('locale'),
          toColumnName(DEFAULT_PRIMARY_KEY),
          toTableName(
            context.schemaBuilder.getObjectTypeConfig('Locale'),
            context.getDBSchemaName()
          ),
          toColumnName('code'),
          locale,
        ]);
      }

      // Apply offset if we have "skip" value
      if (args.skip > 0) {
        query.offset(args.skip);
      }

      // Function to generate filter table alias, they have to be unique across a whole query and
      // any number of query filter branches
      let filterAliasCount = 0;
      const getFilterAlias = (): string => {
        filterAliasCount++;
        return `_f${filterAliasCount}`;
      };

      // Add query filters
      if (args.filter && args.filter.node) {
        query = applyQueryFilter({
          query,
          filter: args.filter.node,
          typeConfig: nodeTypeConfig,
          tableName: nodeTable,
          getTableAlias: getFilterAlias,
          context,
          noPermissionFilters: false,
          preview,
        });
      }

      // Permission filters
      query = applyPermissionQueryFilter({
        query,
        typeConfig: nodeTypeConfig,
        permissions: nodeTypeConfig.permissions,
        tableName: nodeTable,
        getTableAlias: getFilterAlias,
        context,
        preview,
      });

      // Get PG type to build sourceKeyValue table
      let pgTypeName = null;
      if (sourceKeyValues.length !== 1 || sourceKeyValues[0] !== undefined) {
        pgTypeName = getPostgresType({
          fieldName: connectionConfig.edge.sourceField,
          typeName: connectionConfig.node.typeName,
          context,
        });
      }

      // Create the batch loader before we prepare the loader for further manipulate the query object
      const totalCountBatchLoader = createTotalCountBatchLoader({
        query,
        sourceKeyColumn: connectionConfig.edge.sourceField
          ? `${nodeTable}.${toColumnName(connectionConfig.edge.sourceField)}`
          : null,
        sourceKeyValues,
        context,
        db,
        sourceKeyPgTypeName: pgTypeName,
      });

      // Apply limit, we get one more to determine page info "hasNextPage", "hasPreviousPage"
      query = query.limit(limit + 1);

      // Set sorting order
      let orderFields = [DEFAULT_PRIMARY_KEY];
      const reverse =
        Boolean(args) &&
        Boolean(args.orderBy) &&
        args.orderBy.direction === 'DESC';
      if (args.orderBy && args.orderBy.fields) {
        orderFields = args.orderBy.fields;
        // Check if last element is already ID, if not, append ID for cursor pagination
        if (!orderFields.includes(DEFAULT_PRIMARY_KEY)) {
          orderFields.push(DEFAULT_PRIMARY_KEY);
        }
      }
      // Convert fields to column names and construct raw query
      const orderFieldQuery = `(${orderFields
        .map(
          (field) =>
            `"${nodeTable.split('.').join('"."')}"."${toColumnName(field)}"`
        )
        .join(', ')})`;
      const direction = directionForward === !reverse ? 'asc' : 'desc';
      query = query.orderByRaw(`${orderFieldQuery} ${direction}`);

      // We are paginating starting at a cursor position
      if (args.after || args.before) {
        let cursor;
        let operator;
        // Set cursor and operator for forward pagination
        if (directionForward) {
          operator = !reverse ? '>' : '<';
          cursor = args.after;
        } else {
          operator = reverse ? '>' : '<';
          cursor = args.before;
        }

        // We just sort by ID if first order is primary key
        if (orderFields[0] === DEFAULT_PRIMARY_KEY) {
          query = query.whereRaw(`?? ${operator} ?::bigint`, [
            `${nodeTable}.${DEFAULT_PRIMARY_KEY}`,
            cursor,
          ]);
        } else {
          // We get the record from cursor position and filter accordingly
          const cursorValues = orderFields
            .map((field) => {
              return `"ord"."${toColumnName(field)}" "o_${toColumnName(
                field
              )}"`;
            })
            .join(', ');
          query = query.whereRaw(
            `${orderFieldQuery} ${operator} (SELECT ${cursorValues} from ?? ord WHERE id = ?::bigint)`,
            [nodeTable, cursor]
          );
        }
      }

      // Check if we have no sourceField that we need to filter by, so return all objects
      if (connectionConfig.edge.sourceField) {
        /*
        query = query.where(
          `${nodeTable}.${toColumnName(connectionConfig.edge.sourceField)}`,
          typeof sourceKeyValue === 'undefined' ? null : sourceKeyValue
        );

        // Return empty query if sourceKeyValue is undefined
        if (typeof sourceKeyValue === 'undefined') {
          query.whereRaw('FALSE');
        }
         */
      }

      // Join to the list of keys
      let joinedQuery = query;
      let sourceKeyValueSubQuery;
      if (connectionConfig.edge.sourceField && pgTypeName) {
        joinedQuery = query
          .whereRaw('_keys._key = ??', [
            `${nodeTable}.${toColumnName(connectionConfig.edge.sourceField)}`,
          ])
          // Skip results where the sourceKey is undefined
          .whereNot('_keys._skip', true);
        sourceKeyValueSubQuery = db
          .select(
            db.raw(
              `unnest(?::${pgTypeName}[]) as _key, unnest(?::bool[]) as _skip`,
              [
                sourceKeyValues.map((value) =>
                  value === undefined ? null : value
                ),
                sourceKeyValues.map(
                  (value) => value === undefined || value === null
                ),
              ]
            )
          )
          .as('_keys');
      } else {
        // We have no source key values, create dummy list to return the one result
        sourceKeyValueSubQuery = db.select(db.raw('null as _key')).as('_keys');
      }

      const joinedQuerySQL = joinedQuery.toSQL();
      const batchQuery = db
        .select(
          '_keys._key',
          db
            .select(db.raw('json_agg(d) as data'))
            .from(
              db.raw(`(${joinedQuerySQL.sql}) as d`, joinedQuerySQL.bindings)
            )
            .as('data')
        )
        .from(sourceKeyValueSubQuery);

      PostgresHandler.getBatchLoader(context)
        .load(batchQuery)
        .then((combinedRows) => {
          // Transform to connection result
          const connectionResults = combinedRows.map(({ data }, index) => {
            const edges = (data || []).map((row) => {
              const nodeData = {};
              const edgeData = {};
              _.forOwn(row, (val: any, name: string) => {
                if (name.startsWith('n_')) {
                  nodeData[name.substr(2)] = val;
                } else {
                  edgeData[name.substr(2)] = val;
                }
              });
              const nodeObj = PostgresHandler.convertDBResultData(
                nodeData,
                nodeTypeConfig,
                context
              );
              return {
                node: nodeObj,
                cursor: PostgresHandler._getCursorForNode(
                  nodeObj,
                  args,
                  connectionConfig
                ),
              };
            });

            // Remove the edge that we retrieved to determine PageInfo
            const resultingEdges = edges.slice(0, limit);
            if (!directionForward) {
              // Flip direction for backward pagination
              resultingEdges.reverse();
            }

            // Assign connection to position in result array
            return {
              pageInfo: {
                hasNextPage: directionForward ? edges.length > limit : false,
                hasPreviousPage: directionForward
                  ? false
                  : edges.length > limit,
                startCursor: resultingEdges.length
                  ? resultingEdges[0].cursor
                  : null,
                endCursor: resultingEdges.length
                  ? resultingEdges[resultingEdges.length - 1].cursor
                  : null,
              },
              edges: resultingEdges,
              // This should be optimized together with aggregate functionality
              totalCount: createTotalCountLoader(totalCountBatchLoader, index),
            };
          }, []);

          resolve(connectionResults);
        })
        .catch((error) => reject(error));
    }
  });
}

/**
 * Returns the postgres type for the given field
 * @param params
 */
function getPostgresType(params: {
  typeName: string;
  fieldName: string;
  context: Context;
}): string {
  const { typeName, fieldName, context } = params;

  const fieldConfig = assertObjectTypeConfig(
    context.schemaBuilder.typeConfigs[typeName]
  ).fields[fieldName];
  if (!fieldConfig) {
    throw new Error(
      `Could not find fieldConfig for field ${typeName}.${fieldName}`
    );
  }

  const typeConfig = context.schemaBuilder.typeConfigs[fieldConfig.typeName];
  if (!typeConfig) {
    switch (fieldConfig.typeName) {
      case 'ID':
        return 'text';
      case 'String':
        return 'text';
      case 'Float':
        return 'real';
      case 'Int':
        return 'int';
      case 'Decimal':
        return 'decimal';
      case 'DateTime':
        return 'timestamptz';
      default:
        throw new Error(
          `Could not determine DB type of reference column for type ${typeConfig.name}`
        );
    }
  }
  switch (typeConfig.kind) {
    case TypeKind.OBJECT: {
      const typeConfig = context.schemaBuilder.getObjectTypeConfig(
        fieldConfig.typeName
      );
      if (isContent(typeConfig)) {
        return 'uuid';
      } else if (isNode(typeConfig)) {
        return getPgTypeName((typeConfig as ObjectTypeConfig).fields.id);
      }
      throw new Error(
        'Could not determine DB type of reference column for object type'
      );
    }
    case TypeKind.ENUM:
      return 'text';
    case TypeKind.INPUT_OBJECT:
      throw new Error(
        'Could not determine DB type of reference column for input object type'
      );
    case TypeKind.INTERFACE:
      return 'text';
    case TypeKind.SCALAR: {
      switch (typeConfig.name) {
        case 'ID':
          return 'text';
        case 'String':
          return 'text';
        case 'Float':
          return 'real';
        case 'Int':
          return 'int';
        case 'Decimal':
          return 'decimal';
        case 'DateTime':
          return 'timestamptz';
        default:
          throw new Error(
            `Could not determine DB type of reference column for type ${typeConfig.name}`
          );
      }
    }
    case TypeKind.UNION:
      throw new Error(
        'Could not determine DB type of reference column for union type'
      );
    default:
      throw new Error('Unknown type kind');
  }
}

type TotalCountBatchLoader = () => Promise<string[]>;

/**
 * Creates the total count loader for a single value
 * @param batchLoader
 * @param position // The position of the value in the batch
 */
function createTotalCountLoader(
  batchLoader: TotalCountBatchLoader,
  position: number
) {
  return async () => {
    const values = await batchLoader();
    if (values.length <= position) {
      return 0;
    }
    return values[position];
  };
}

/**
 * Creates a batch loader for totalCount values
 * @param query
 * @param db
 * @param context
 * @param sourceKeyColumn
 * @param sourceKeyValues
 * @param sourceKeyPgTypeName
 */
function createTotalCountBatchLoader({
  query,
  db,
  context,
  sourceKeyColumn,
  sourceKeyValues,
  sourceKeyPgTypeName,
}: {
  query: QueryBuilder;
  context: Context;
  sourceKeyValues: any[];
  db: Knex;
  sourceKeyColumn: string | null;
  sourceKeyPgTypeName: string | null;
}): TotalCountBatchLoader {
  // Wrap in function so promise code isn't executed if field is not resolved
  let countQuery = query.clone().clearSelect().clearOrder().offset(0);

  if (
    sourceKeyPgTypeName &&
    !(sourceKeyValues.length === 1 && sourceKeyValues[0] === undefined)
  ) {
    const filteredSourceKeyValues = sourceKeyValues
      // Ignore undefined and NULL filter values
      .filter((value) => !(value === undefined || value === null))
      // Add type casting to make this work with RDS Data API
      .map((value) => db.raw(`?::${sourceKeyPgTypeName}`, [value]));
    countQuery = countQuery
      .select(db.raw(`count(*) as count, ?? as key`, [sourceKeyColumn]))
      .whereIn(sourceKeyColumn, filteredSourceKeyValues)
      .groupBy(sourceKeyColumn);
  } else {
    countQuery = countQuery.select(db.raw('count(*) as count, null as key'));
  }

  return () => {
    return new Promise<string[]>(async (resolve, reject) => {
      try {
        // Load through batch loader
        const result = await PostgresHandler.getBatchLoader(context).load(
          countQuery
        );

        // Create key value map
        const valueMap = result.reduce((valueMap: {}, { count, key }) => {
          valueMap[String(key)] = count;
          return valueMap;
        }, {});

        // Map sourceKeyValues to count values from DB
        const countValues = sourceKeyValues.map((keyValue) => {
          if (keyValue === undefined) {
            return valueMap['null'] || '0';
          } else {
            return valueMap[String(keyValue)] || '0';
          }
        });
        resolve(countValues);

        /*
        // Join to the list of keys
        let joinedQuery;
        if (sourceKeyPgTypeName) {
          joinedQuery = countQuery.whereRaw('_keys._key = ??', [
            sourceKeyColumn
          ]);
          // Skip values with undefined key
          joinedQuery = joinedQuery.whereNot('_keys._skip', true);
        } else {
          joinedQuery = countQuery;
        }


        const batchQuery = db
          .select(
            sourceKeyPgTypeName ? '_keys._key' : db.raw('1'),
            db.select(
              db.raw('count(*) as count')
            ).from(
              db.raw(`(${PostgresHandler.queryToString(joinedQuery, db)}) as d`)
            ).as('data')
          )
          .from(
            db.select(
              sourceKeyPgTypeName ?
                db.raw(
                  `unnest(?::${sourceKeyPgTypeName}[]) as _key, unnest(?::bool[]) as _skip`,
                  [
                    sourceKeyValues.map(value => (value === undefined) ? null : value),
                    // Skip undefined / null values if we have sourceKeyType
                    sourceKeyValues.map(value => value === undefined || value === null),
                  ]
                ) :
                db.raw('1')
            ).as('_keys')
          );

        const result = await batchQuery;
         */
      } catch (e) {
        reject(e);
      }
    });
  };
}
