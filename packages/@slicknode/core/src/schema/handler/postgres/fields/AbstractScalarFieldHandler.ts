/**
 * Created by Ivo Meißner on 01.06.17.
 *
 */

import AbstractFieldHandler from './AbstractFieldHandler';

import {
  FieldConfig,
  isContent,
  ObjectTypeConfig,
} from '../../../../definition';

import { HandlerError } from '../../base';

import toColumnName from '../toColumnName';
import toIndexName from '../toIndexName';
import toUniqueConstraintName from '../toUniqueConstraintName';

import type { Knex } from 'knex';

import Context from '../../../../context';

import { MigrationScope } from '../../base';

/* eslint-disable no-unused-vars */
export default class AbstractScalarFieldHandler extends AbstractFieldHandler {
  /**
   * Creates the DB columns on the given table for the field
   * Returns an optional Promise that executes deferred operations in the database after
   * all createField operations are executed during a migration.
   * This can be used to create foreignKey constraints.
   */
  createField(
    table: any,
    fieldName: string,
    fieldConfig: FieldConfig,
    scope: MigrationScope
  ): void {
    if (fieldConfig.list) {
      throw new HandlerError(
        `List is not supported for fields of type ${this.getTypeName()}`
      );
    }

    // Determine length
    let column = table[this.getKnexFunctionName()](
      toColumnName(fieldName),
      ...this.getKnexFunctionArguments()
    );

    if (fieldConfig.index || fieldConfig.unique) {
      column = column.index(toIndexName(table._tableName, [fieldName]));
    }
    if (fieldConfig.required) {
      column.notNullable();
    }
  }

  /**
   * Creates the field dependencies like ForeignKeyConstraints
   * This function is executed after the field was created and after all other types
   * are created within the migration
   */
  createFieldDependencies(
    db: Knex,
    typeConfig: ObjectTypeConfig,
    fieldName: string,
    fieldConfig: FieldConfig,
    scope: MigrationScope,
    tableName: string
  ) {
    if (fieldConfig.list) {
      throw new HandlerError(
        `List is not supported for fields of type ${this.getTypeName()}`
      );
    }
    let queryBuilder = null;

    if (fieldConfig.unique) {
      const columnName = toColumnName(fieldName);

      // For content types, we need to add the locale field, so we can have
      // the same value for multiple locales
      const columns = [columnName];
      if (isContent(typeConfig) && fieldName !== 'locale') {
        columns.push(toColumnName('locale'));
      }

      queryBuilder = db.schema.raw(
        db
          .raw(
            `create unique index ?? on ?? (${columns
              .map(() => '??')
              .join(', ')}) where ?? is not null`,
            [
              toUniqueConstraintName(tableName, [columnName]),
              tableName,
              ...columns,
              columnName,
            ]
          )
          .toString()
      );
    }

    return queryBuilder;
  }

  /**
   * Updates the field dependencies like ForeignKeyConstraints
   * This function is executed after the field was updated and after all other types
   * are created within the migration
   */
  updateFieldDependencies(
    db: Knex,
    typeConfig: ObjectTypeConfig,
    fieldName: string,
    fieldConfig: FieldConfig,
    previousConfig: FieldConfig,
    scope: MigrationScope,
    tableName: string
  ) {
    if (fieldConfig.list) {
      throw new HandlerError(
        `List is not supported for fields of type ${this.getTypeName()}`
      );
    }

    let queryBuilder = null;

    if (fieldConfig.unique && !previousConfig.unique) {
      const columnName = toColumnName(fieldName);

      // For content types, we need to add the locale field, so we can have
      // the same value for multiple locales
      const columns = [columnName];
      if (isContent(typeConfig) && fieldName !== 'locale') {
        columns.push(toColumnName('locale'));
      }

      queryBuilder = db.raw(
        `create unique index ?? on ?? (${columns
          .map(() => '??')
          .join(', ')}) where ?? is not null`,
        [
          toUniqueConstraintName(tableName, [columnName]),
          tableName,
          ...columns,
          columnName,
        ]
      );
    }

    return queryBuilder;
  }

  /**
   * Deletes the DB columns for the table
   */
  deleteField(table: any, fieldName: string, fieldConfig: FieldConfig): void {
    table.dropColumn(toColumnName(fieldName));
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
    if (fieldConfig.list) {
      throw new HandlerError(
        `List is not supported for fields of type ${this.getTypeName()}`
      );
    }

    // Determine length
    let column = table[this.getKnexFunctionName()](
      toColumnName(fieldName),
      ...this.getKnexFunctionArguments()
    );

    if (fieldConfig.required) {
      column = column.notNullable();
    } else {
      column = column.nullable();
    }

    // Only add index if not already created
    if (
      (fieldConfig.index || fieldConfig.unique) &&
      !previousConfig.index &&
      !previousConfig.unique
    ) {
      column = column.index(toIndexName(table._tableName, [fieldName]));
    }
    // Drop index if it existed before but is not necessary any more
    if (
      !fieldConfig.index &&
      !fieldConfig.unique &&
      (previousConfig.index || previousConfig.unique)
    ) {
      table.dropIndex(
        null,
        // If we have schema name, add prefix
        (scope.config.schemaName ? scope.config.schemaName + '.' : '') +
          toIndexName(table._tableName, [fieldName])
      );
    }

    if (!fieldConfig.unique && previousConfig.unique) {
      table.dropIndex(
        null,
        // If we have schema name, add prefix
        (scope.config.schemaName ? scope.config.schemaName + '.' : '') +
          toUniqueConstraintName(table._tableName, [fieldName])
      );
    }

    column.alter();
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
    db: Knex
  ): {
    [x: string]: any;
  } {
    return {
      [toColumnName(fieldName)]: input[fieldName],
    };
  }

  /**
   * Prepares the default value to be inserted into the DB
   * The FieldConfig.defaultValue is passed as an argument and the function
   * returns a value that is then passed to knex.insert({fieldName: value})
   */
  prepareDefaultValue(defaultValue: any, knex: Knex): any {
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

  /**
   * Applies the filter to the given query builder
   * @param queryBuilder The Knex query builder
   * @param fieldName The field name
   * @param fieldConfig The field config
   * @param tableName The table name
   * @param filterValue The filter value that was provided via GraphQL args
   * @param getTableAlias Returns a free table alias that can be used for joins
   * @param context
   * @return Returns the query builder with filter arguments applied
   */
  applyQueryFilter(
    queryBuilder: Knex.QueryBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    tableName: string,
    filterValue: any,
    getTableAlias: () => string,
    context: Context
  ): Knex.QueryBuilder {
    throw new Error('applyQueryFilter is not implemented');
  }

  /**
   * Returns the GraphQL type name
   */
  getTypeName(): string {
    throw new Error('getTypeName is not implemented');
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    throw new Error('getKnexFunctionName is not implemented');
  }

  /**
   * Returns the arguments that are passed to the knex function to create the column
   * @returns {Array}
   */
  getKnexFunctionArguments(): Array<any> {
    return [];
  }
}
