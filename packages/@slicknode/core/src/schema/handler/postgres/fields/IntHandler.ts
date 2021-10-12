/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { FieldConfig } from '../../../../definition';

import toColumnName from '../toColumnName';

import Context from '../../../../context';
import _ from 'lodash';

import Knex$Knex, { QueryBuilder } from 'knex';

import AbstractScalarFieldHandler from './AbstractScalarFieldHandler';

/* eslint-disable no-unused-vars */
export default class FloatHandler extends AbstractScalarFieldHandler {
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
    queryBuilder: QueryBuilder,
    fieldName: string,
    fieldConfig: FieldConfig,
    tableName: string,
    filterValue: any,
    getTableAlias: () => string,
    context: Context
  ): QueryBuilder {
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
            `Unknown filter operator "${operator}" for ${this.getTypeName()} field`
          );
      }
    });
    return queryBuilder;
  }

  /**
   * Returns the GraphQL type name
   */
  getTypeName(): string {
    return 'Int';
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    return 'integer';
  }
}
