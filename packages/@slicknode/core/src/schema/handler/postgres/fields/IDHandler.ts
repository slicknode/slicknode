/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { FieldConfig, ObjectTypeConfig } from '../../../../definition';

import { HandlerError, MigrationScope } from '../../base';

import toColumnName from '../toColumnName';

import Knex$Knex, { QueryBuilder, TableBuilder } from 'knex';

import Context from '../../../../context';
import _ from 'lodash';
import { fromGlobalId } from '../../../../utils/id';

import AbstractFieldHandler from './AbstractFieldHandler';
import { FieldStorageType } from '../../../../definition/FieldStorageType';

/* eslint-disable no-unused-vars */
export default class IDHandler extends AbstractFieldHandler {
  /**
   * Creates the DB columns on the given table for the field
   * Returns an optional Promise that executes deferred operations in the database after
   * all createField operations are executed during a migration.
   * This can be used to create foreignKey constraints.
   */
  createField(
    table: TableBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    scope: MigrationScope
  ): void {
    if (fieldName === 'id') {
      if (fieldConfig.storageType === FieldStorageType.UUID) {
        // For some reason
        const pkConstraintName =
          (table as any)._tableName.split('.').pop() + '_pkey';
        table
          .uuid(toColumnName(fieldName))
          .defaultTo(scope.config.db.raw('uuid_generate_v4()'))
          .primary(pkConstraintName);
      } else {
        table.bigIncrements().primary();
      }
    } else {
      throw new HandlerError('ID field is only allowed as primary key');
    }
  }

  /**
   * Creates the field dependencies like ForeignKeyConstraints
   * This function is executed after the field was created and after all other types
   * are created within the migration
   */
  createFieldDependencies(
    db: Knex$Knex,
    typeConfig: ObjectTypeConfig,
    fieldName: string,
    fieldConfig: FieldConfig,
    scope: MigrationScope
  ): PromiseLike<any> | undefined | null {
    return;
  }

  /**
   * Updates the field dependencies like ForeignKeyConstraints
   * This function is executed after the field was updated and after all other types
   * are created within the migration
   */
  updateFieldDependencies(
    db: Knex$Knex,
    typeConfig: ObjectTypeConfig,
    fieldName: string,
    fieldConfig: FieldConfig,
    previousConfig: FieldConfig,
    scope: MigrationScope
  ): PromiseLike<any> | undefined | null {
    return;
  }

  /**
   * Deletes the DB columns for the table
   */
  deleteField(table: any, fieldName: string, fieldConfig: FieldConfig): void {
    throw new HandlerError('The primary key field cannot be deleted');
  }

  /**
   * Updates the field in the existing table
   */
  updateField(
    table: any,
    fieldName: string,
    fieldConfig: FieldConfig,
    previousConfig: FieldConfig,
    scope: MigrationScope
  ): void {
    throw new HandlerError('Migration of ID field is not supported');
  }

  /**
   * Applies the filter to the given query builder
   * @param queryBuilder The Knex query builder
   * @param fieldName The field name
   * @param fieldConfig The field config
   * @param tableName The table name
   * @param filterValue The filter value that was provided via GraphQL args
   * @param getTableAlias Returns a free table alias that can be used for joins
   * @param context
   * @param preview
   * @return Returns the query builder with filter arguments applied
   */
  applyQueryFilter(
    queryBuilder: QueryBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    tableName: string,
    filterValue: any,
    getTableAlias: () => string,
    context: Context,
    preview: boolean
  ): QueryBuilder {
    const columnName = toColumnName(fieldName);
    _.forOwn(filterValue, (value: any, operator: string) => {
      /* eslint-disable no-case-declarations */
      let cleanedId;
      let cleanedIds: Array<number | string> = [];
      if (_.isArray(value)) {
        cleanedIds = getCleanedIds(value, fieldConfig);
      } else {
        cleanedId = getCleanedId(value, fieldConfig);
      }
      const pgTypeName = getPgTypeName(fieldConfig);
      switch (operator) {
        case 'eq':
          if (cleanedId) {
            queryBuilder.whereRaw(`?? = ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'notEq':
          if (cleanedId) {
            queryBuilder.whereRaw(`not ?? = ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('TRUE');
          }
          break;
        case 'in':
          if (cleanedIds.length) {
            queryBuilder.whereRaw(
              `?? in (${cleanedIds.map(() => `?::${pgTypeName}`).join(',')})`,
              [tableName + '.' + columnName, ...cleanedIds]
            );
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'gt':
          if (cleanedId) {
            queryBuilder.whereRaw(`?? > ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'gte':
          if (cleanedId) {
            queryBuilder.whereRaw(`?? >= ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'lt':
          if (cleanedId) {
            queryBuilder.whereRaw(`?? < ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'lte':
          if (cleanedId) {
            queryBuilder.whereRaw(`?? <= ?::${pgTypeName}`, [
              tableName + '.' + columnName,
              cleanedId,
            ]);
          } else {
            queryBuilder.whereRaw('FALSE');
          }
          break;
        case 'notIn':
          if (cleanedIds.length) {
            queryBuilder.whereRaw(
              `?? not in (${cleanedIds
                .map(() => `?::${pgTypeName}`)
                .join(',')})`,
              [tableName + '.' + columnName, ...cleanedIds]
            );
          }
          break;
        case 'isNull':
          if (value) {
            queryBuilder.whereNull(tableName + '.' + columnName);
          } else {
            queryBuilder.whereNotNull(tableName + '.' + columnName);
          }
          break;
        default:
          throw new Error(`Unknown filter operator "${operator}" for ID field`);
      }
      /* eslint-enable no-case-declarations */
    });
    return queryBuilder;
  }

  /**
   * Returns an object of all values that should be saved to the DB instance
   * These values will be passed to knex.insert(*)
   * Only returns the values that are relevant to the field, other values of input
   * are ignored
   */
  prepareValues(
    input: {
      [x: string]: any;
    },
    fieldName: string,
    fieldConfig: FieldConfig,
    addDefault: boolean,
    db: Knex$Knex
  ): {
    [x: string]: any;
  } {
    let value = input[fieldName];

    // Add explicit type casting so bigint field works with RDS Data API driver
    // See: https://forums.aws.amazon.com/thread.jspa?threadID=312154&tstart=0
    //
    // Only add type casting for non NULL values
    const preparedValue =
      value !== null && value !== undefined
        ? db.raw(`?::${getPgTypeName(fieldConfig)}`, [value])
        : value;

    return {
      [toColumnName(fieldName)]: preparedValue,
    };
  }

  /**
   * Prepares the default value to be inserted into the DB
   * The FieldConfig.defaultValue is passed as an argument and the function
   * returns a value that is then passed to knex.insert({fieldName: value})
   */
  prepareDefaultValue(defaultValue: any, knex: Knex$Knex): any {
    return defaultValue;
  }

  /**
   * Extracts the data from the RDBMS result object. The return value will then
   * be passed to the resolver
   *
   * @param result
   * @param fieldName
   * @param fieldConfig
   */
  extractValue(
    result: {
      [x: string]: any;
    },
    fieldName: string,
    fieldConfig: FieldConfig
  ): any {
    return result[toColumnName(fieldName)];
  }

  /**
   * Returns an array of all column names for the field where the data is stored
   * @param fieldName
   * @param fieldConfig
   */
  getColumnNames(fieldName: string, fieldConfig: FieldConfig): Array<string> {
    return [toColumnName(fieldName)];
  }
}

/**
 * Converts a globalID to the UUID. Returns NULL if we have invalid UUID
 * @param value
 * @param fieldConfig
 */
function getCleanedId(
  value: string,
  fieldConfig: FieldConfig
): null | number | string {
  // Check if is UUID
  try {
    if (fieldConfig.storageType === FieldStorageType.UUID) {
      return validator.isUUID(value) ? value : null;
    } else {
      const tmpId = Number(fromGlobalId(value).id);
      return tmpId || null;
    }
  } catch (err) {
    return null;
  }
}

/**
 * Converts an array of global IDs to the UUIDs. Removes all values that are not valid UUIDs
 * @param values
 * @param fieldConfig
 */
function getCleanedIds(
  values: Array<string>,
  fieldConfig: FieldConfig
): Array<number | string> {
  return values
    .map((value) => getCleanedId(value, fieldConfig))
    .filter((val) => val !== null);
}

/**
 * Returns the postgres type name
 * @param config
 */
export function getPgTypeName(config: FieldConfig): string {
  return config.storageType === FieldStorageType.UUID ? 'uuid' : 'bigint';
}
