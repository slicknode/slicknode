/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { FieldConfig } from '../../../../definition';

import toColumnName from '../toColumnName';

import Knex$Knex, { QueryBuilder } from 'knex';

import Context from '../../../../context';

import _ from 'lodash';

import AbstractScalarFieldHandler from './AbstractScalarFieldHandler';

/* eslint-disable no-unused-vars */
export default class StringHandler extends AbstractScalarFieldHandler {
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
    const db = context.getDBRead();
    _.forOwn(filterValue, (value: any, operator: string) => {
      switch (operator) {
        case 'eq':
          queryBuilder.where(
            tableName + '.' + columnName,
            castParameterValue(value, db)
          );
          break;
        case 'notEq':
          queryBuilder.whereNot(
            tableName + '.' + columnName,
            castParameterValue(value, db)
          );
          break;
        case 'in':
          queryBuilder.whereIn(
            tableName + '.' + columnName,
            castParameterValue(value, db)
          );
          break;
        case 'notIn':
          queryBuilder.whereNotIn(
            tableName + '.' + columnName,
            castParameterValue(value, db)
          );
          break;
        case 'gt':
          queryBuilder.where(
            tableName + '.' + columnName,
            '>',
            castParameterValue(value, db)
          );
          break;
        case 'gte':
          queryBuilder.where(
            tableName + '.' + columnName,
            '>=',
            castParameterValue(value, db)
          );
          break;
        case 'lt':
          queryBuilder.where(
            tableName + '.' + columnName,
            '<',
            castParameterValue(value, db)
          );
          break;
        case 'lte':
          queryBuilder.where(
            tableName + '.' + columnName,
            '<=',
            castParameterValue(value, db)
          );
          break;
        case 'startsWith':
          if (value) {
            queryBuilder.where(
              tableName + '.' + columnName,
              'like',
              value.replace(/%/g, '\\%') + '%'
            );
          }
          break;
        case 'endsWith':
          if (value) {
            queryBuilder.where(
              tableName + '.' + columnName,
              'like',
              '%' + value.replace(/%/g, '\\%')
            );
          }
          break;
        case 'contains':
          if (value) {
            queryBuilder.where(
              tableName + '.' + columnName,
              'like',
              '%' + value.replace(/%/g, '\\%') + '%'
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
    return 'String';
  }

  /**
   * Returns the name of the function that is used to create the field, for example 'text' for knex.text()
   */
  getKnexFunctionName(): string {
    return 'text';
  }
}

/**
 * @TODO: We need to add type castings to filter params bcs. RDS Data API cannot cast types
 * automatically.
 *
 * See: https://forums.aws.amazon.com/thread.jspa?threadID=312154&tstart=0
 * https://github.com/slicknode/rds-data-api-client-pg/blob/1c0473d6e843e0daf8e08f712ec840ea8721c0d3/src/formatUtils.ts#L59
 *
 * @param value
 * @param db
 */
function castParameterValue(value: any, db: Knex$Knex) {
  if (typeof value === 'string') {
    return db.raw('?::text', [value]);
  } else if (_.isArray(value)) {
    return value.map((v) => castParameterValue(v, db));
  }
  return value;
}
