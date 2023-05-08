/**
 * Created by Ivo Meißner on 01.06.17.
 *
 */

import type { Knex } from 'knex';

import { FieldConfig, ObjectTypeConfig } from '../../../../definition';

import { MigrationScope } from '../../base';

import Context from '../../../../context';

/* eslint-disable no-unused-vars */
export default class AbstractFieldHandler {
  /**
   * Creates the DB columns on the given table for the field
   * Returns an optional Promise that executes deferred operations in the database after
   * all createField operations are executed during a migration.
   * This can be used to create foreignKey constraints.
   */
  createField(
    table: Knex.TableBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    scope: MigrationScope
  ): void {
    throw new Error('createField is not implemented');
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
  ): PromiseLike<any> | undefined | null {
    return;
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
  ): PromiseLike<any> | undefined | null {
    return;
  }

  /**
   * Deletes the DB columns for the table
   */
  deleteField(
    table: Knex.TableBuilder,
    fieldName: string,
    fieldConfig: FieldConfig
  ): void {
    throw new Error('deleteField is not implemented');
  }

  /**
   * Updates the field in the existing table
   */
  updateField(
    table: Knex.TableBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    previousConfig: FieldConfig,
    scope: MigrationScope
  ): void {
    throw new Error('updateField is not implemented');
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
   * @param noPermissionFilters
   * @param preview True if we are in preview mode
   * @return Returns the query builder with filter arguments applied
   */
  applyQueryFilter(
    queryBuilder: Knex.QueryBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    tableName: string,
    filterValue: any,
    getTableAlias: () => string,
    context: Context,
    noPermissionFilters: boolean,
    preview: boolean
  ): Knex.QueryBuilder {
    throw new Error('applyQueryFilter is not implemented');
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
    db: Knex,
    context: Context
  ): {
    [x: string]: any;
  } {
    throw new Error('prepareValues is not implemented');
  }

  /**
   * Prepares the default value to be inserted into the DB
   * The FieldConfig.defaultValue is passed as an argument and the function
   * returns a value that is then passed to knex.insert({fieldName: value})
   */
  prepareDefaultValue(defaultValue: any, knex: Knex): any {
    throw new Error('prepareDefaultValue is not implemented');
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
    throw new Error('extractValue is not implemented');
  }

  /**
   * Returns an array of all column names for the field where the data is stored
   * @param fieldName
   * @param fieldConfig
   */
  getColumnNames(fieldName: string, fieldConfig: FieldConfig): Array<string> {
    throw new Error('getColumnNames is not implemented');
  }
}
