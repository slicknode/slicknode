/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { FieldConfig } from '../../../../definition';

import type { Knex } from 'knex';

import Context from '../../../../context';
import _ from 'lodash';

import toColumnName from '../toColumnName';

import AbstractScalarFieldHandler from './AbstractScalarFieldHandler';

/* eslint-disable no-unused-vars */
export default class DecimalHandler extends AbstractScalarFieldHandler {
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
      const db = context.getDBRead();
      switch (operator) {
        case 'eq':
          queryBuilder.where(
            tableName + '.' + columnName,
            prepareParamValue(value, db)
          );
          break;
        case 'notEq':
          queryBuilder.whereNot(
            tableName + '.' + columnName,
            prepareParamValue(value, db)
          );
          break;
        case 'in':
          queryBuilder.whereIn(
            tableName + '.' + columnName,
            (value || []).map((val) => prepareParamValue(val, db))
          );
          break;
        case 'notIn':
          queryBuilder.whereNotIn(
            tableName + '.' + columnName,
            (value || []).map((val) => prepareParamValue(val, db))
          );
          break;
        case 'gt':
          queryBuilder.where(
            tableName + '.' + columnName,
            '>',
            prepareParamValue(value, db)
          );
          break;
        case 'gte':
          queryBuilder.where(
            tableName + '.' + columnName,
            '>=',
            prepareParamValue(value, db)
          );
          break;
        case 'lt':
          queryBuilder.where(
            tableName + '.' + columnName,
            '<',
            prepareParamValue(value, db)
          );
          break;
        case 'lte':
          queryBuilder.where(
            tableName + '.' + columnName,
            '<=',
            prepareParamValue(value, db)
          );
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
            `Unknown filter operator "${operator}" for ${this.getTypeName()} field`
          );
      }
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
    db: Knex
  ): {
    [x: string]: any;
  } {
    let value = input[fieldName];

    // Add explicit type casting so decimal field works with RDS Data API driver
    // See: https://forums.aws.amazon.com/thread.jspa?threadID=312154&tstart=0
    //
    // Only add type casting for non NULL values
    const preparedValue =
      value !== null && value !== undefined
        ? db.raw('?::decimal', [value])
        : value;

    return {
      [toColumnName(fieldName)]: preparedValue,
    };
  }

  /**
   * Returns the GraphQL type name
   */
  getTypeName(): string {
    return 'Decimal';
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    return 'decimal';
  }

  /**
   * Returns the knex function arguments
   */
  getKnexFunctionArguments(): Array<any> {
    return [null];
  }
}

/**
 * Prepares a parameter value, adds type casting if necessary
 * @param value
 * @param db
 */
function prepareParamValue(value: null | string | number, db: Knex) {
  if (value === null) {
    return value;
  }

  return db.raw('?::decimal', [value]);
}
