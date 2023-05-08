/**
 * Created by Ivo Meißner on 13.12.16.
 *
 */

import { FieldConfig } from '../../../../definition';

import type { Knex } from 'knex';

import Context from '../../../../context';

import toColumnName from '../toColumnName';

import AbstractScalarFieldHandler from './AbstractScalarFieldHandler';

/* eslint-disable no-unused-vars */
export default class BooleanHandler extends AbstractScalarFieldHandler {
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
    const columnName = toColumnName(fieldName);
    if (filterValue === null) {
      queryBuilder.whereNull(tableName + '.' + columnName);
    } else {
      queryBuilder.where(tableName + '.' + columnName, filterValue === true);
    }
    return queryBuilder;
  }

  /**
   * Returns the GraphQL type name
   */
  getTypeName(): string {
    return 'Boolean';
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    return 'boolean';
  }
}
