/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import {
  assertObjectTypeConfig,
  ConnectionConfig,
  ConnectionLoaderArgs,
  FieldConfig,
  isContent,
  isContentUnion,
  isNode,
  isObjectTypeConfig,
  ObjectTypeConfig,
  TypeConfig,
  TypeKind,
  UnionTypeConfig,
} from '../../../definition';

import {
  combineMigrationActions,
  combineMigrationUpdateActions,
  Handler,
  HANDLER_POSTGRES,
  MigrationAction,
  MigrationScope,
  MigrationUpdateAction,
} from '../base';

import { Permission } from '../../../auth/type';

import { AccessDeniedError, ValidationError } from '../../../errors';
import Context from '../../../context';
import * as fields from './fields/index';
import AbstractFieldHandler from './fields/AbstractFieldHandler';
import getConnectionListResult from './getConnectionListResult';
import getOneToOneResult from './getOneToOneResult';
import toColumnName from './toColumnName';
import toTableName, { TableType } from './toTableName';
import Knex, { QueryBuilder } from 'knex';
import applyPermissionQueryFilter from './applyPermissionQueryFilter';
import DataLoader from 'dataloader';

import { isOneToOneRelation } from '../../connectionBuilder';

import _ from 'lodash';
import { DEFAULT_PRIMARY_KEY } from './constants';
import { getPgTypeName } from './fields/IDHandler';
import { FieldStorageType } from '../../../definition/FieldStorageType';
import isUUID from 'validator/lib/isUUID';
import { getAutoCompleteQueryField } from './getAutoCompleteQueryField';
import { getFieldHandler } from './getFieldHandler';
import { createTypeTable } from './migration/createTypeTable';
import { updateTypeTable } from './migration/updateTypeTable';
import { deleteTypeTable } from './migration/deleteTypeTable';
import { createHistoryTypeConfig } from '../../createHistoryTypeConfig';
import toUniqueConstraintName from './toUniqueConstraintName';
import {
  createHistoryTrigger,
  updateHistoryTrigger,
} from './migration/migrateHistoryTrigger';
import { addNodeToSurrogateCache } from '../../../cache/surrogate/utils';
import { checkRecordLimit } from './checkRecordLimit';

const BATCH_LOADER_CACHE_KEY = 'batchLoader';

enum TypeAction {
  CREATE,
  UPDATE,
  DELETE,
}

export default class PostgresHandler extends Handler {
  /**
   * Creates the type
   * @param params
   */
  createType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationAction {
    const { typeConfig, scope } = params;
    // Check if we have object type
    if (isObjectTypeConfig(typeConfig)) {
      const tables = getMigrationTableSet({
        schemaName: scope.config.schemaName,
        typeConfig,
      });

      const migrationActions = tables.map(({ tableName, config }) =>
        createTypeTable({
          tableName,
          scope,
          typeConfig: config,
        })
      );

      // Add history triggers
      if (isContent(typeConfig)) {
        migrationActions.push(
          createHistoryTrigger({
            typeConfig,
            scope,
          })
        );
      }

      return combineMigrationActions(migrationActions);
    }

    throw new Error('Can only create Object type');
  }

  /**
   * Returns the AbstractFieldHandler for the field
   *
   * @param fieldConfig
   * @param scope
   * @returns {AbstractFieldHandler}
   */
  getHandler(
    fieldConfig: FieldConfig,
    scope: MigrationScope
  ): AbstractFieldHandler {
    return getFieldHandler(fieldConfig, scope);
  }

  /**
   * Updates an existing type
   * @param params
   */
  updateType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationUpdateAction {
    const { typeConfig, scope } = params;
    if (typeConfig.kind === TypeKind.OBJECT) {
      // Check if type exists in current scope
      if (!scope.currentTypes.hasOwnProperty(typeConfig.name)) {
        throw new Error(
          `Update failed: The type ${typeConfig.name} does not exist`
        );
      }

      // Check if kind is changed
      const currentTypeConfig = scope.currentTypes[typeConfig.name];
      if (currentTypeConfig.kind !== typeConfig.kind) {
        throw new Error('Cannot change kind of type');
      }

      // Cannot change between content node and non content node
      const typeIsContentNode = isContent(typeConfig);
      if (isContent(currentTypeConfig) !== typeIsContentNode) {
        throw new Error('Cannot add or remove Content interface');
      }

      // Add default node table for update
      const tables = getMigrationTableSet({
        typeConfig,
        schemaName: scope.config.schemaName,
      });

      const migrationActions: MigrationUpdateAction[] = tables.map(
        ({ tableName, config, tableType }) =>
          updateTypeTable({
            typeConfig: config,
            tableName,
            scope,
            currentTypeConfig:
              tableType === TableType.HISTORY
                ? // If we have history table, generate history type config from current type to compare
                  createHistoryTypeConfig(currentTypeConfig)
                : currentTypeConfig,
          })
      );

      // Add history trigger for content nodes
      if (typeIsContentNode) {
        migrationActions.push({
          update: updateHistoryTrigger({
            typeConfig,
            scope,
          }),
        });
      }

      return combineMigrationUpdateActions(migrationActions);
    }

    throw new Error('Can only update types that are of kind object');
  }

  /**
   * Deletes the type
   * @param params
   */
  deleteType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationAction {
    const { typeConfig, scope } = params;

    if (!isObjectTypeConfig(typeConfig)) {
      throw new Error('Can only delete types of kind object');
    }
    const tableTypes = getMigrationTableSet({
      typeConfig,
      schemaName: scope.config.schemaName,
    });

    const actions = tableTypes.map(({ tableType, config }) =>
      deleteTypeTable({
        typeConfig: config,
        tableType,
        scope,
      })
    );

    return combineMigrationActions(actions);
  }

  /**
   * Returns the remaining number of nodes / total records for the given object type
   * @param params
   */
  static async getRecordLimit(params: {
    typeConfig: ObjectTypeConfig;
    context: Context;
  }): Promise<{
    // Total remaining number of all records within limits
    total: number;
    // Remaining number of allowed nodes within limits
    nodes: number;
  }> {
    const result = await checkRecordLimit({
      typeConfig: params.typeConfig,
      context: params.context,
    });
    return {
      total: result.totalRemaining,
      nodes: result.nodesRemaining,
    };
  }

  /**
   * Returns the query string to be used for the autoComplete index
   * The columns are represented as ?? to be used in prepared statement
   *
   * @param fieldNames
   * @private
   */
  static _getAutoCompleteQueryField(fieldNames: Array<string>): string {
    return getAutoCompleteQueryField(fieldNames);
  }

  /**
   * Returns a promise that publishes an object to a new status
   * The resolve function returns the published objects
   *
   * @param params
   */
  static async publish(params: {
    typeConfig: ObjectTypeConfig;
    ids: string[]; // Ids to publish
    status: string; // Name of the status
    context: Context;
    permissions: Permission[]; // The permission filters to apply
  }): Promise<any[]> {
    const { typeConfig, ids, status, context, permissions } = params;
    const publishedStatus = status === 'PUBLISHED';

    const db = context.getDBWrite();

    const previewTable = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      TableType.PREVIEW
    );
    const publishedTable = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      TableType.DEFAULT
    );

    let tableIndex = 0;
    const getTableAlias = () => {
      tableIndex++;
      return `f${tableIndex}`;
    };

    // Update nodes in preview table
    const pgIdType = getPgTypeName(typeConfig.fields.id);
    const idColumn = toColumnName('id');
    const statusTable = toTableName(
      context.schemaBuilder.getObjectTypeConfig('ContentStatus'),
      context.getDBSchemaName()
    );
    const values = {
      publishedAt: new Date(),
      publishedBy: context.auth.uid,
      status: db.raw(`(select id from ?? where ?? = ?)`, [
        statusTable,
        toColumnName('name'),
        status,
      ]),
    };
    const preparedValues = PostgresHandler.prepareValues(
      values,
      typeConfig,
      context
    );

    const columns = PostgresHandler._getAllColumnNames(
      typeConfig.name,
      context
    );
    let query = db(previewTable)
      .update(
        preparedValues,
        publishedStatus
          ? // If we publish to non-preview status, we load data from published table instead, so only return ID here
            [toColumnName('id')]
          : getReturningColumns({
              context,
              typeConfig,
              db,
            })
      )
      .whereRaw(`?? in (${ids.map(() => `?::${pgIdType}`).join(', ')})`, [
        idColumn,
        ...ids,
      ]);
    query = applyPermissionQueryFilter({
      context,
      typeConfig,
      permissions,
      preview: true,
      tableName: previewTable,
      getTableAlias,
      query,
    });
    const previewUpdateResult = await query;

    // If published, copy to non-preview
    if (publishedStatus) {
      const updatedIds = previewUpdateResult.map(({ id }) => id);

      // Check permission queries filtered some items, throw access denied error in case
      if (updatedIds.length !== ids.length) {
        throw new AccessDeniedError(
          'Permission denied to publish the content items'
        );
      }

      // Move to published table
      const publishQuery = db.raw(
        `insert into ?? (${columns.map(() => '??').join(', ')}) ` +
          `(select ${columns
            .map(() => '??')
            .join(', ')} from ?? where ?? in (${updatedIds.map(
            () => `?::${pgIdType}`
          )})) ` +
          `on conflict (??) do update set ${columns
            .map((col) => `"${col}" = EXCLUDED."${col}"`)
            .join(', ')} returning ${buildJsonObjectExpression(
            columns
          )} as data`,
        [
          publishedTable,
          ...columns,
          ...columns,
          previewTable,
          idColumn,
          ...updatedIds,
          idColumn,
          ...columns,
        ]
      );
      const publishedResult = await publishQuery;
      return publishedResult.rows.map((row) =>
        PostgresHandler.convertDBResultData(row.data, typeConfig, context)
      );
    } else {
      return previewUpdateResult.map((row) =>
        PostgresHandler.convertDBResultData(row.data, typeConfig, context)
      );
    }

    return [];
  }

  /**
   * Returns a promise that unpublishes a list of nodes
   * The resolve function returns the published objects
   *
   * @param params
   */
  static async unpublish(params: {
    typeConfig: ObjectTypeConfig;
    ids: string[]; // Ids to unpublish
    context: Context;
    permissions: Permission[]; // The permission filters to apply
  }): Promise<any[]> {
    const { typeConfig, ids, context, permissions } = params;

    const db = context.getDBWrite();

    const previewTable = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      TableType.PREVIEW
    );
    const publishedTable = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      TableType.DEFAULT
    );

    let tableIndex = 0;
    const getTableAlias = () => {
      tableIndex++;
      return `f${tableIndex}`;
    };

    // Ger DB identifiers
    const pgIdType = getPgTypeName(typeConfig.fields.id);
    const idColumn = toColumnName('id');
    const statusTable = toTableName(
      context.schemaBuilder.getObjectTypeConfig('ContentStatus'),
      context.getDBSchemaName()
    );

    // Set published values to NULL in preview table
    const preparedValues = PostgresHandler.prepareValues(
      {
        publishedAt: null,
        publishedBy: null,
      },
      typeConfig,
      context
    );
    await db(previewTable)
      .update(preparedValues, [toColumnName('id')])
      .whereRaw(`?? in (${ids.map(() => `?::${pgIdType}`).join(', ')})`, [
        idColumn,
        ...ids,
      ]);

    // Set status for nodes with status PUBLISHED to DRAFT in preview table
    const preparedStatusValues = PostgresHandler.prepareValues(
      {
        status: db.raw(`(select id from ?? where ?? = ?)`, [
          statusTable,
          toColumnName('name'),
          'DRAFT',
        ]),
      },
      typeConfig,
      context
    );
    await db(previewTable)
      .update(preparedStatusValues, [toColumnName('id')])
      // Only reset status to DRAFT if has not changed after publishing and is still PUBLISHED
      .where(
        toColumnName('status'),
        db.raw(`(select id from ?? where ?? = ?)`, [
          statusTable,
          toColumnName('name'),
          'PUBLISHED',
        ])
      )
      .whereRaw(`?? in (${ids.map(() => `?::${pgIdType}`).join(', ')})`, [
        idColumn,
        ...ids,
      ]);

    // Delete nodes from published table
    let deleteQuery = db(publishedTable)
      .returning(
        getReturningColumns({
          context,
          typeConfig,
          db,
        })
      )
      .whereRaw(`?? in (${ids.map(() => `?::${pgIdType}`).join(', ')})`, [
        idColumn,
        ...ids,
      ]);
    // Apply permission query filter on published table
    deleteQuery = applyPermissionQueryFilter({
      context,
      typeConfig,
      permissions,
      preview: false,
      tableName: publishedTable,
      getTableAlias,
      query: deleteQuery,
    });
    const rows = (await deleteQuery.del()) as any; // @TODO: Use as any, bcs. query.returning doesn't have type defs in knex;
    if (rows.length !== ids.length) {
      throw new AccessDeniedError(
        "You don't have permission to unpublish the content items"
      );
    }
    const nodes = rows.map(({ data }) =>
      PostgresHandler.convertDBResultData(data, typeConfig, context)
    );

    return nodes;
  }

  /**
   * Returns a promise that creates an object and stores it in the DB
   * The resolve function returns the created object
   *
   * @param typeConfig
   * @param values
   * @param context
   * @param preview
   */
  static async create(
    typeConfig: ObjectTypeConfig,
    values: {
      [x: string]: any;
    },
    context: Context,
    preview: boolean = false
  ): Promise<any> {
    const db = context.getDBWrite();
    let preparedValues = { ...values };
    const tableType =
      preview && isContent(typeConfig) ? TableType.PREVIEW : TableType.DEFAULT;
    const tableName = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      tableType
    );

    try {
      // Add default values, check unique
      _.forOwn(
        typeConfig.fields,
        (fieldConfig: FieldConfig, fieldName: string) => {
          if (
            !_.has(values, fieldName) &&
            !_.isUndefined(fieldConfig.defaultValue)
          ) {
            preparedValues[
              fieldName
            ] = PostgresHandler.getFieldHandlerFromContext(
              fieldConfig,
              context
            ).prepareDefaultValue(fieldConfig.defaultValue, db);
          }
        }
      );
      preparedValues = PostgresHandler.prepareValues(
        preparedValues,
        typeConfig,
        context
      );

      // Run DB query
      const columns = this._getAllColumnNames(typeConfig.name, context);
      const result = await db(tableName).insert(preparedValues).returning(
        getReturningColumns({
          db,
          typeConfig,
          context,
        })
      );

      return PostgresHandler.convertDBResultData(
        result[0].data,
        typeConfig,
        context
      );
    } catch (error) {
      // Transform error to user friendly one, for example, check if we have unique constraint violation
      throw transformError({
        error,
        typeConfig,
        context,
        tableName,
      });
    }
  }

  /**
   * Returns a promise that updates an object in the DB
   * The resolve function returns the updated object
   *
   * @param typeConfig
   * @param id
   * @param values
   * @param context
   * @param preview
   */
  static async update(
    typeConfig: ObjectTypeConfig,
    id: string,
    values: {
      [x: string]: any;
    },
    context: Context,
    preview: boolean = false
  ): Promise<any> {
    const db = context.getDBWrite();
    let preparedValues = { ...values };
    const tableType =
      preview && isContent(typeConfig) ? TableType.PREVIEW : TableType.DEFAULT;
    const tableName = toTableName(
      typeConfig,
      context.getDBSchemaName(),
      tableType
    );

    // Determine pg type of PK field
    const idFieldConfig = typeConfig.fields[DEFAULT_PRIMARY_KEY];
    const pkTypeName = getPgTypeName(idFieldConfig);

    // Add default values, check unique
    preparedValues = PostgresHandler.prepareValues(
      preparedValues,
      typeConfig,
      context
    );

    // Check if we have fields to update
    if (!Object.keys(preparedValues).length) {
      throw new Error('No fields to update');
    }

    // Run update DB query
    try {
      const result = await db(tableName)
        .whereRaw(`?? = ?::${pkTypeName}`, [DEFAULT_PRIMARY_KEY, id])
        .update(preparedValues)
        .returning(
          getReturningColumns({
            db,
            typeConfig,
            context,
          })
        );

      return PostgresHandler.convertDBResultData(
        result[0].data,
        typeConfig,
        context
      );
    } catch (error) {
      throw transformError({
        error,
        typeConfig,
        context,
        tableName,
      });
    }
  }

  /**
   * Returns a promise that creates an object in the DB or updates an existing
   * one if a unique constraint fails
   *
   * @param typeConfig
   * @param values
   * @param context
   */
  static async upsert(
    typeConfig: ObjectTypeConfig,
    values: {
      [x: string]: any;
    },
    context: Context
  ) {
    // Prepare values
    const preparedValues = PostgresHandler.prepareValues(
      values,
      typeConfig,
      context,
      true
    );

    // Check if we have value for unique field
    const uniqueFields = Object.keys(typeConfig.fields).reduce(
      (fields: string[], fieldName) => {
        const fieldConfig = typeConfig.fields[fieldName];
        if (fieldConfig.unique && fieldName !== DEFAULT_PRIMARY_KEY) {
          fields.push(toColumnName(fieldName));
        }
        return fields;
      },
      [DEFAULT_PRIMARY_KEY]
    );

    // Determine which unique field should be used to merge
    const mergeField = uniqueFields.find((fieldName) => {
      return (
        preparedValues.hasOwnProperty(fieldName) &&
        preparedValues[fieldName] !== null
      );
    });

    // No field to merge, insert
    if (!mergeField) {
      return await PostgresHandler.create(typeConfig, values, context);
    }

    // Do upsert
    const tableName = toTableName(typeConfig, context.getDBSchemaName());
    const db = context.getDBWrite();

    const columnNames = Object.keys(preparedValues);
    const columnValues = Object.values(preparedValues);

    // For non ID fields, we have partial index and need to add the index condition
    let conflictCondition =
      mergeField !== DEFAULT_PRIMARY_KEY ? ' where ?? is not null' : '';

    const returningColumns = getReturningColumns({
      db,
      typeConfig,
      context,
    });
    const result = await db.raw(
      `insert into ?? (${columnNames.map(
        () => '??'
      )}) values (${columnNames.map(
        () => '?'
      )}) on conflict (??)${conflictCondition} do update set ${columnNames
        .map(() => '?? = ?')
        .join(', ')} returning ${returningColumns.map(() => '?').join(', ')}`,
      [
        tableName,
        ...columnNames,
        ...columnValues,
        mergeField,
        ...(mergeField !== DEFAULT_PRIMARY_KEY ? [mergeField] : []),
        ...columnNames.reduce((tmpValues, columnName) => {
          tmpValues.push(columnName);
          tmpValues.push(preparedValues[columnName]);
          return tmpValues;
        }, []),
        ...returningColumns,
      ]
    );

    return PostgresHandler.convertDBResultData(
      result.rows[0].data,
      typeConfig,
      context
    );
  }

  /**
   * Returns a promise that deletes the entries where the given values match, usually {id: 'pkID123'}
   * Resolves the deleted nodes if returnNodes = true, otherwise the number of deleted records
   *
   * @param typeConfig
   * @param where
   * @param context
   * @param returnNodes
   * @param preview
   */
  static async delete(
    typeConfig: ObjectTypeConfig,
    where:
      | {
          [x: string]: any;
        }
      | Function,
    context: Context,
    returnNodes: boolean = false,
    preview: boolean = false
  ): Promise<Array<any> | number> {
    return await new Promise((resolve: Function, reject: Function) => {
      const tableType =
        preview && isContent(typeConfig)
          ? TableType.PREVIEW
          : TableType.DEFAULT;
      const db = context.getDBWrite();
      let query = db(
        toTableName(typeConfig, context.getDBSchemaName(), tableType)
      );
      if (typeof where === 'function') {
        query.where(where);
      } else {
        query.where(PostgresHandler.prepareValues(where, typeConfig, context));
      }
      if (returnNodes) {
        query = query.returning(
          getReturningColumns({
            context,
            typeConfig,
            db,
          })
        );
      }
      query
        .del()
        .then(((rows: Array<any>) => {
          if (!returnNodes) {
            return resolve(rows);
          }
          if (rows.length) {
            resolve(
              rows.map((row) =>
                PostgresHandler.convertDBResultData(
                  row.data,
                  typeConfig,
                  context
                )
              )
            );
          }

          resolve([]);
        }) as any) // @TODO: Use as any, bcs. query.returning doesn't have type defs in knex
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Prepares the input values to be saved to the DB
   *
   * @param input
   * @param typeConfig
   * @param context
   * @param addDefault
   */
  static prepareValues(
    input: {
      [x: string]: any;
    },
    typeConfig: ObjectTypeConfig,
    context: Context,
    addDefault: boolean = false
  ): {
    [x: string]: any;
  } {
    const result = {};
    _.forOwn(
      typeConfig.fields,
      (fieldConfig: FieldConfig, fieldName: string) => {
        if (_.has(input, fieldName)) {
          const handler = PostgresHandler.getFieldHandlerFromContext(
            fieldConfig,
            context
          );
          _.assign(
            result,
            handler.prepareValues(
              input,
              fieldName,
              fieldConfig,
              addDefault,
              context.getDBRead(),
              context
            )
          );
        }
      }
    );
    return result;
  }

  /**
   * Converts the DB result to the type data
   *
   * @param result
   * @param typeConfig
   * @param context
   */
  static convertDBResultData(
    result: {
      [x: string]: any;
    },
    typeConfig: ObjectTypeConfig,
    context: Context
  ): {
    [x: string]: any;
  } {
    const data: { [x: string]: any } = {};
    _.forOwn(
      typeConfig.fields,
      (fieldConfig: FieldConfig, fieldName: string) => {
        const handler = PostgresHandler.getFieldHandlerFromContext(
          fieldConfig,
          context
        );
        data[fieldName] = handler.extractValue(result, fieldName, fieldConfig);
      }
    );

    // Set __typename for type resolving (relay node)
    data.__typename = typeConfig.name;

    return data;
  }

  /**
   * Returns the field handler for the given field
   *
   * @param fieldConfig
   * @param context
   * @returns {AbstractFieldHandler}
   */
  static getFieldHandlerFromContext(
    fieldConfig: FieldConfig,
    context: Context
  ): AbstractFieldHandler {
    if (_.has(fields, fieldConfig.typeName)) {
      return fields[fieldConfig.typeName];
    }

    // Check if is related type
    const typeConfig: TypeConfig | undefined | null = _.get(
      context.schemaBuilder,
      'typeConfigs.' + fieldConfig.typeName
    );

    if (typeConfig) {
      switch (typeConfig.kind) {
        case TypeKind.OBJECT:
          if (
            typeConfig.handler &&
            typeConfig.handler.kind === HANDLER_POSTGRES
          ) {
            return isContent(typeConfig)
              ? fields.Content
              : fields.RelatedObject;
          }
          break;
        case TypeKind.ENUM:
          return fields.Enum;
        case TypeKind.UNION:
          if (isContentUnion(typeConfig, context.schemaBuilder.typeConfigs)) {
            return fields.ContentUnion;
          }
          break;
      }
    }

    throw new Error(
      `No field handler found for type ${fieldConfig.typeName} in context`
    );
  }

  /**
   * Creates a DataLoader instance for the given connection
   * The batchLoadFn of the data loader is called with Array<ConnectionLoaderArgs>
   *
   * @param connectionConfig
   * @param context
   * @param preview
   * @param locale // ISO locale code
   */
  static getConnectionLoader(
    connectionConfig: ConnectionConfig,
    context: Context,
    preview: boolean,
    locale: string | null
  ): DataLoader<any, any> {
    return new DataLoader(
      async (keys: Array<ConnectionLoaderArgs>) => {
        // Add surrogate cache keys
        if (context.surrogateCache) {
          addNodeToSurrogateCache({
            typeConfig: context.schemaBuilder.getObjectTypeConfig(
              connectionConfig.node.typeName
            ),
            node: null,
            preview,
            context,
          });
          // Add surrogate key for edge if exists
          if (connectionConfig.edge.typeName) {
            addNodeToSurrogateCache({
              typeConfig: context.schemaBuilder.getObjectTypeConfig(
                connectionConfig.edge.typeName
              ),
              node: null,
              preview,
              context,
            });
          }
        }

        if (
          !isOneToOneRelation(
            connectionConfig,
            context.schemaBuilder.typeConfigs
          )
        ) {
          // Create a map with the stringified arguments, so we can batch the connections with the same
          // input arguments.
          const connectionLoadConfigs: {
            [serializedArgs: string]: any;
          } = keys.reduce((loadConfigMap, loaderArgs, index) => {
            const stringifiedArgs = JSON.stringify(loaderArgs.args);
            if (!loadConfigMap.hasOwnProperty(stringifiedArgs)) {
              loadConfigMap[stringifiedArgs] = [];
            }
            loadConfigMap[stringifiedArgs].push({
              loaderArgs,
              index,
            });
            return loadConfigMap;
          }, {});

          // For each set of input arguments, load the connections in batch, one batch each
          const multiBatchResults = await Promise.all(
            Object.entries(connectionLoadConfigs).map(
              async ([_, loadConfigs]) => {
                const [first] = loadConfigs;
                const data = await getConnectionListResult(
                  loadConfigs.map((l) => l.loaderArgs.sourceKeyValue),
                  connectionConfig,
                  first.loaderArgs.args,
                  context,
                  preview,
                  locale
                );

                // Merge the connection result with the original index of the load configuration to bring
                // them back in order afterwards
                return loadConfigs.map((loadConfig, connectionIndex) => ({
                  index: loadConfig.index,
                  data: data[connectionIndex],
                }));
              }
            )
          );

          // Sort to match input argument order for data loader
          const finalResults = multiBatchResults.reduce(
            (orderedResults, multiBatchResult) => {
              multiBatchResult.reduce((orderedResultsInner, batchResult) => {
                orderedResultsInner[batchResult.index] = batchResult.data;
                return orderedResultsInner;
              }, orderedResults);
              return orderedResults;
            },
            []
          );
          return finalResults;
        }

        return await getOneToOneResult(
          keys,
          connectionConfig,
          context,
          preview,
          locale
        );
      },
      {
        cacheKeyFn: JSON.stringify,
      }
    );
  }

  /**
   * Returns all column names for the given type name
   * @param typeName
   * @param context
   * @returns {Array}
   * @private
   */
  static _getAllColumnNames(typeName: string, context: Context): Array<string> {
    const columnNames = [];
    _.forOwn(
      assertObjectTypeConfig(context.schemaBuilder.typeConfigs[typeName])
        .fields,
      (fieldConfig: FieldConfig, fieldName: string) => {
        const handler = PostgresHandler.getFieldHandlerFromContext(
          fieldConfig,
          context
        );
        handler.getColumnNames(fieldName, fieldConfig).forEach((name) => {
          columnNames.push(name);
        });
      }
    );
    return columnNames;
  }

  /**
   * Returns the cursor for an edge on the given node
   * @param node
   * @param args
   * @param connectionConfig
   * @returns {*}
   * @private
   */
  static _getCursorForNode(
    node: {
      [x: string]: any;
    },
    args: {
      [x: string]: any;
    },
    connectionConfig: ConnectionConfig
  ): string {
    return node[connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY];
  }

  /**
   * Returns a batch loader that combines multiple queries into a single SQL query via JSON
   * aggregation
   *
   * @param context
   */
  static getBatchLoader(context: Context): DataLoader<QueryBuilder, any> {
    const cache = context.getTempCache<string, DataLoader<QueryBuilder, any>>(
      'handler:Postgres'
    );
    if (cache.has(BATCH_LOADER_CACHE_KEY)) {
      return cache.get(BATCH_LOADER_CACHE_KEY);
    }
    const batchLoader = new DataLoader<any, any>(
      async (queries: Array<QueryBuilder>) => {
        let bindings = [];

        const fields = queries
          .map((query, index) => {
            const sql = query.toSQL();
            for (const binding of sql.bindings || []) {
              bindings.push(binding);
            }

            return `(select json_agg(d) from (${sql.sql}) d) as q${index}`;
            /*
        const sql = PostgresHandler.queryToString(query, context.getDBRead());

        // Change date bindings to be parsed on postgres to prevent timezone issues
        return `(select json_agg(d) from (${sql}) d) as q${index}`;
         */
          })
          .join(',');
        const results = await context.getDBRead().raw(
          // Escape question marks in query
          `select ${fields}`,
          bindings
        );
        return Object.keys(queries).map(
          (key) => _.get(results, `rows[0].q${key}`, []) || []
        );
      },
      {
        cacheKeyFn: (qb: QueryBuilder) => qb.toString(),
      }
    );
    cache.set(BATCH_LOADER_CACHE_KEY, batchLoader);
    return batchLoader;
  }

  /**
   * Returns the dataloader to get nodes of the given type
   *
   * @param typeConfig
   * @param context
   * @param keyField The field on the object that is the key, default is the "id"
   * @param preview
   * @param locale
   */
  static getLoader(
    typeConfig: ObjectTypeConfig | UnionTypeConfig,
    context: Context,
    keyField: string = 'id',
    preview: boolean = false,
    locale: string | null = null
  ): DataLoader<any, any> {
    if (isNode(typeConfig)) {
      return PostgresHandler._getNodeLoader({
        typeConfig,
        context,
        locale,
        preview,
        keyField,
      });
    } else if (isContentUnion(typeConfig, context.schemaBuilder.typeConfigs)) {
      return PostgresHandler._getUnionLoader({
        typeConfig,
        context,
        locale,
        preview,
        keyField,
      });
    } else {
      throw new Error(`Invalid type for loader: ${typeConfig!.name}`);
    }
  }

  /**
   * Returns the loader for content union types
   * @param params
   * @private
   */
  static _getUnionLoader(params: {
    typeConfig: UnionTypeConfig;
    context: Context;
    keyField: string;
    preview: boolean;
    locale: string | null;
  }): DataLoader<any, any> {
    const { context, typeConfig, keyField, preview, locale } = params;
    return new DataLoader(async (ids: Array<string>) => {
      const contentNodes = await context.getLoader('ContentNode').loadMany(ids);
      const loaders = contentNodes.map(async (node) => {
        // Only return content nodes that are part of union type
        if (node && typeConfig.typeNames.includes(node.type)) {
          return await context
            .getLoader(node.type, 'contentNode', preview, locale)
            .load(node.id);
        }
        return null;
      });
      return await Promise.all(loaders);
    });
  }

  /**
   * Returns the loader for nodes
   * @param params
   * @private
   */
  static _getNodeLoader(params: {
    typeConfig: ObjectTypeConfig;
    context: Context;
    keyField: string;
    preview: boolean;
    locale: string | null;
  }): DataLoader<any, any> {
    const { context, typeConfig, keyField, preview, locale } = params;
    const isContentNode = isContent(typeConfig);
    return new DataLoader(async (ids: Array<string>) => {
      return await new Promise((resolve: Function, reject: Function) => {
        const db = context.getDBRead();
        const columnName = toColumnName(keyField);
        const schemaName = context.getDBSchemaName();

        // Build query
        const tableName = toTableName(
          typeConfig,
          schemaName,
          preview && isContentNode ? TableType.PREVIEW : TableType.DEFAULT
        );

        // Remove invalid keys for primary key
        const fieldConfig = typeConfig.fields[keyField];
        let filteredIds: any[] = ids.filter((id) => {
          if (keyField === DEFAULT_PRIMARY_KEY) {
            if (fieldConfig.storageType === FieldStorageType.UUID) {
              return isUUID(id) ? id : false;
            } else {
              return Number(id);
            }
          }
          return true;
        });

        // Get field config to determine PG type
        let pgType: string;

        switch (fieldConfig.typeName) {
          case 'ID':
            pgType = getPgTypeName(fieldConfig);
            break;
          case 'Decimal':
            pgType = 'decimal';
            break;
          // Pass RDS Data API driver supported values as is
          case 'Int':
          case 'Boolean':
          case 'String':
          case 'Float':
          case 'DateTime':
            break;
          default:
            const fieldType =
              context.schemaBuilder.typeConfigs[fieldConfig.typeName];
            if (fieldType && isContentNode) {
              pgType = 'uuid';
            } else if (fieldType && isNode(fieldType)) {
              pgType = getPgTypeName(fieldType.fields[DEFAULT_PRIMARY_KEY]);
            }
            break;
        }

        // Add explicit type casts to values
        if (pgType) {
          filteredIds = filteredIds.map((id) => db.raw(`?::${pgType}`, [id]));
        }

        let query = db(tableName).whereIn(columnName, filteredIds);

        // Add locale filtering
        if (isContentNode && locale) {
          const localeTable = toTableName(
            context.schemaBuilder.getObjectTypeConfig('Locale'),
            schemaName
          );
          let filterSelect = db.select(toColumnName('id')).from(localeTable);
          if (locale) {
            filterSelect.where(toColumnName('code'), locale);
          } else {
            filterSelect.where(toColumnName('isDefault'), true);
          }
          query.where(toColumnName('locale'), filterSelect);
        }

        let aliasCount = 0;
        function getTableAlias(): string {
          aliasCount++;
          return '_f' + aliasCount;
        }

        query = applyPermissionQueryFilter({
          query,
          typeConfig,
          permissions: typeConfig.permissions,
          tableName,
          getTableAlias,
          context,
          preview,
        });

        // Process results
        PostgresHandler.getBatchLoader(context)
          .load(query)
          .then((rows) => {
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
                map[row[columnName]] = PostgresHandler.convertDBResultData(
                  row,
                  typeConfig,
                  context
                );
                return map;
              },
              {}
            );

            // Map IDs, add surrogate keys
            const nodes = ids.map((id) => {
              const node = valueMap[id] || null;
              if (context.surrogateCache) {
                addNodeToSurrogateCache({
                  context,
                  typeConfig,
                  preview,
                  node,
                });
              }

              return node;
            });
            resolve(nodes);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  /**
   * Validates if the node with the given id matches any of the provided permissions
   *
   * @param ids
   * @param permissions
   * @param typeConfig
   * @param context
   * @param preview
   * @param locale
   * @returns {Promise.<void>}
   */
  static async hasPermission(
    ids: string[],
    permissions: Array<Permission>,
    typeConfig: ObjectTypeConfig,
    context: Context,
    preview: boolean = false,
    locale: string | null = null
  ): Promise<boolean> {
    if (!ids) {
      throw new Error(
        'The provided object has to be a node with at least an ID property'
      );
    }

    const db = context.getDBRead();
    const columnName = toColumnName(DEFAULT_PRIMARY_KEY);

    // Build query
    let tableName: string;
    if (preview && isContent(typeConfig)) {
      tableName = toTableName(
        typeConfig,
        context.getDBSchemaName(),
        TableType.PREVIEW
      );
    } else {
      tableName = toTableName(typeConfig, context.getDBSchemaName());
    }

    const fieldConfig = typeConfig.fields[DEFAULT_PRIMARY_KEY];
    const pgTypeName = getPgTypeName(fieldConfig);
    let query = db(tableName).whereRaw(
      `?? in (${ids.map(() => `?::${pgTypeName}`).join(', ')})`,
      [columnName, ...ids]
    );
    let aliasCount = 0;
    function getTableAlias(): string {
      aliasCount++;
      return '_f' + aliasCount;
    }
    query = applyPermissionQueryFilter({
      query,
      typeConfig,
      permissions,
      tableName,
      getTableAlias,
      context,
      preview,
    });

    const result = await query;
    return result && result.length === ids.length;
  }

  /**
   * Returns a promise that returns the searched object or NULL
   * If more than one column is returned by the datastore, the first element
   * will be resolved
   *
   * @param typeConfig
   * @param where An object of filters to be applied to the query in the form {fieldName: value}
   * @param context
   * @param preview
   */
  static async find(
    typeConfig: ObjectTypeConfig,
    where:
      | {
          [x: string]: any;
        }
      | Function,
    context: Context,
    preview: boolean = false
  ): Promise<
    | {
        [x: string]: any;
      }
    | undefined
    | null
  > {
    return await new Promise((resolve, reject) => {
      this.fetchAll(typeConfig, where, context, preview)
        .then((nodes) => {
          if (nodes.length) {
            resolve(nodes[0]);
          } else {
            resolve(null);
          }
        })
        .catch(reject);
    });
  }

  /**
   * Returns a promise that returns the searched object or NULL
   * If more than one column is returned by the datastore, the first element
   * will be resolved
   *
   * @param typeConfig
   * @param where An object of filters to be applied to the query in the form {fieldName: value}
   * @param context
   * @param preview
   */
  static async fetchAll(
    typeConfig: ObjectTypeConfig,
    where:
      | {
          [x: string]: any;
        }
      | Function,
    context: Context,
    preview: boolean = false
  ): Promise<
    Array<{
      [x: string]: any;
    }>
  > {
    return await new Promise((resolve: Function, reject: Function) => {
      const db = context.getDBRead();

      // Prepare where statement
      let preparedWhere = where;
      if (typeof where !== 'function') {
        _.forOwn(where, (val: any, key: string) => {
          if (!typeConfig.fields.hasOwnProperty(key)) {
            throw new Error(
              `Field "${key}" not found in type "${typeConfig.name}"`
            );
          }
        });
        preparedWhere = PostgresHandler.prepareValues(
          where,
          typeConfig,
          context
        );
      }

      // Build query
      const query = db(
        toTableName(
          typeConfig,
          context.getDBSchemaName(),
          preview && isContent(typeConfig)
            ? TableType.PREVIEW
            : TableType.DEFAULT
        )
      )
        .select(
          getReturningColumns({
            typeConfig,
            db,
            context,
            as: '__data',
          })
        )
        .where(preparedWhere);

      // Process results
      query
        .then((rows) => {
          if (rows.length) {
            resolve(
              rows.map((row) =>
                this.convertDBResultData(row.__data, typeConfig, context)
              )
            );
          } else {
            resolve([]);
          }
        })
        .catch((error) => {
          reject(error);
        });
    });
  }
}

/**
 * Creates the columns for a RETURNING statement. We need to do JSON aggregate because UUID[] is not
 * supported by RDS Data API
 * @param params
 * @private
 */
function getReturningColumns(params: {
  typeConfig: ObjectTypeConfig;
  db: Knex;
  context: Context;
  as?: string; // The column name, default is "data"
}) {
  const columns = PostgresHandler._getAllColumnNames(
    params.typeConfig.name,
    params.context
  );

  return [
    params.db.raw(
      `${buildJsonObjectExpression(columns)} as ${params.as || 'data'}`,
      columns
    ) as any,
  ];
}

/**
 * Builds the postgres expression that builds the JSON object for the given columns
 * @param columns
 */
function buildJsonObjectExpression(columns: string[]): string {
  // We split columns into chunks of 50 to avoid postgres max_arg_number limit of 100 when building object
  // Then we merge the JSONB objects into one
  const partialObjects = _.chunk(columns, 50).map(
    (chunk) =>
      `jsonb_build_object(${chunk.map((col) => `'${col}', ??`).join(', ')})`
  );
  return `(${partialObjects.join(' || ')})`;
}

/**
 * Transforms an error thrown from the database, and converts it to a user friendly
 * error, adding additional details etc.
 * @param params
 */
function transformError(params: {
  error: Error;
  typeConfig: ObjectTypeConfig;
  context: Context;
  tableName: string;
}): Error {
  const { error, typeConfig, tableName, context } = params;
  // Unique constraint violation
  if (error.message.includes('violates unique constraint')) {
    let constraintNames =
      error.message.match(new RegExp('"(unique_[a-zA-Z0-9_]+)"', 'gm')) || [];
    if (constraintNames && constraintNames.length) {
      // Clean matches
      constraintNames = constraintNames.map((name) => name.split('"').join(''));
    }

    const failedFields: string[] = [];

    // Match constraint name to fields
    for (const constraintName of constraintNames) {
      for (const fieldName of Object.keys(typeConfig.fields)) {
        const fieldConfig = typeConfig.fields[fieldName];
        if (fieldConfig.unique) {
          if (
            constraintName ===
            toUniqueConstraintName(tableName, [toColumnName(fieldName)])
          ) {
            failedFields.push(fieldName);
          }
        }
      }
    }

    // Add failed fields to error
    const inputErrors = failedFields.reduce((argumentErrors, fieldName) => {
      argumentErrors[fieldName] = {
        message: context.res.__(
          'handler.postgres.errors.field.unique:An object with that value already exists'
        ),
      };
      return argumentErrors;
    }, {});

    return new ValidationError(
      context.res.__('handler.postgres.errors.unique:Unique constraint fails'),
      inputErrors
    );
  }

  return error;
}

/**
 * Returns the set of all tables and type configs that need to be migrated (adds history, preview tables for content)
 * @param params
 */
function getMigrationTableSet(params: {
  typeConfig: ObjectTypeConfig;
  schemaName: string;
}): Array<{
  config: ObjectTypeConfig;
  tableName: string;
  tableType: TableType;
}> {
  const { typeConfig, schemaName } = params;
  const tables = [
    // Create node table
    {
      tableName: toTableName(typeConfig, schemaName),
      config: typeConfig,
      tableType: TableType.DEFAULT,
    },
  ];

  // If we have Content, add additional tables
  const isContentNode = isContent(typeConfig);
  if (isContentNode) {
    // Add preview table
    const previewTableName = toTableName(
      typeConfig,
      schemaName,
      TableType.PREVIEW
    );
    tables.push({
      config: typeConfig,
      tableName: previewTableName,
      tableType: TableType.PREVIEW,
    });

    // Add history table
    const historyConfig = createHistoryTypeConfig(typeConfig);
    tables.push({
      config: historyConfig,
      tableName: toTableName(historyConfig, schemaName, TableType.HISTORY),
      tableType: TableType.HISTORY,
    });
  }
  return tables;
}
