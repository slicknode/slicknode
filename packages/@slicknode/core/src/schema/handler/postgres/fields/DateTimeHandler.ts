/**
 * Created by Ivo Meißner on 01.12.16.
 *
 */

import { FieldConfig } from '../../../../definition';

import toColumnName from '../toColumnName';

import Context from '../../../../context';
import _ from 'lodash';

import type { Knex } from 'knex';

import AbstractScalarFieldHandler from './AbstractScalarFieldHandler';

/* eslint-disable no-unused-vars */
export default class DateTimeHandler extends AbstractScalarFieldHandler {
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
    _.forOwn(filterValue, (value: any, operator: string) => {
      switch (operator) {
        case 'eq':
          queryBuilder.where(tableName + '.' + columnName, value);
          break;
        case 'notEq':
          queryBuilder.whereNot(tableName + '.' + columnName, value);
          break;
        case 'in':
          queryBuilder.whereIn(tableName + '.' + columnName, value);
          break;
        case 'notIn':
          queryBuilder.whereNotIn(tableName + '.' + columnName, value);
          break;
        case 'gt':
          queryBuilder.where(tableName + '.' + columnName, '>', value);
          break;
        case 'gte':
          queryBuilder.where(tableName + '.' + columnName, '>=', value);
          break;
        case 'lt':
          queryBuilder.where(tableName + '.' + columnName, '<', value);
          break;
        case 'lte':
          queryBuilder.where(tableName + '.' + columnName, '<=', value);
          break;
        case 'isNull':
          if (value) {
            queryBuilder.whereNull(tableName + '.' + columnName);
          } else {
            queryBuilder.whereNotNull(tableName + '.' + columnName);
          }
          break;
        default:
          throw new Error(
            `Unknown filter operator "${operator}" for DateTime field`
          );
      }
    });
    return queryBuilder;
  }

  /**
   * Prepares the default value to be inserted into the DB
   * The FieldConfig.defaultValue is passed as an argument and the function
   * returns a value that is then passed to knex.insert({fieldName: value})
   */
  prepareDefaultValue(defaultValue: any, knex: Knex): any {
    if (defaultValue === 'now') {
      return knex.fn.now();
    }
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
    const value = result[toColumnName(fieldName)];
    // For JSON aggregated values, the string is returned, so create a date object
    if (typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }

  /**
   * Returns the GraphQL type name
   */
  getTypeName(): string {
    return 'DateTime';
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    return 'datetime';
  }
}
