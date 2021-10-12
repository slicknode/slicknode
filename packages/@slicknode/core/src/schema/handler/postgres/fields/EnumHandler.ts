/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

import {
  FieldConfig,
  TypeConfig,
  ObjectTypeConfig,
  EnumValueConfig,
  TypeConfigMap,
  isContent,
} from '../../../../definition';

import { TypeKind } from '../../../../definition';

import { HandlerError } from '../../base';

import Context from '../../../../context';

import toColumnName from '../toColumnName';
import toIndexName from '../toIndexName';
import toUniqueConstraintName from '../toUniqueConstraintName';
import toCheckConstraintName from '../toCheckConstraintName';

import Knex$Knex, { QueryBuilder } from 'knex';

import { MigrationScope } from '../../base';

import _ from 'lodash';

import AbstractFieldHandler from './AbstractFieldHandler';

/* eslint-disable no-unused-vars */
export default class EnumHandler extends AbstractFieldHandler {
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
      throw new HandlerError('List is not supported for fields of type Enum');
    }

    // Get values from Enum type
    const enumType: TypeConfig | undefined | null = _.get(
      scope.newTypes,
      fieldConfig.typeName
    );
    if (!enumType) {
      throw new Error(
        `TypeConfig not registered in migration scope for enum type ${fieldConfig.typeName}`
      );
    }

    // Create column builder object
    let column = table.text(toColumnName(fieldName));

    // add index
    if (fieldConfig.index && !fieldConfig.unique) {
      column = column.index(toIndexName(table._tableName, [fieldName]));
    }

    // Add no NULL constraint
    if (fieldConfig.required) {
      column = column.notNullable();
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
    scope: MigrationScope,
    tableName: string
  ) {
    if (fieldConfig.list) {
      throw new HandlerError('List is not supported for fields of type Enum');
    }

    const columnName = toColumnName(fieldName);

    // Add check constraint for possible values
    const values = this._getEnumValues(scope.newTypes, fieldConfig.typeName);
    let queryBuilder = db.schema.raw(
      db
        .raw(
          `alter table ?? add constraint ?? check (?? in (${values
            .map((v) => '?')
            .join(', ')}))`,
          [
            tableName,
            toCheckConstraintName(tableName, [fieldName]),
            columnName,
            ...values,
          ]
        )
        .toString()
    );
    // @TODO: Somehow knex messes up the arguments
    // error: alter table "n_user" add constraint "check_8db24b58a36e1771c00ecb4ef737ff83" check ("user_type" in
    // ($1, $2, $3)) - bind message supplies 3 parameters, but prepared statement "" requires 0
    queryBuilder = db.schema.raw(queryBuilder.toString());

    if (fieldConfig.unique) {
      // For content types, we need to add the locale field, so we can have
      // the same value for multiple locales
      const columns = [columnName];
      if (isContent(typeConfig) && fieldName !== 'locale') {
        columns.push(toColumnName('locale'));
      }

      queryBuilder = queryBuilder.raw(
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
   * Returns the values for the given enum type name, sorted
   * Raises an error if type has no values or if is invalid enum type
   *
   * @param typeConfigMap
   * @param typeName
   * @private
   */
  _getEnumValues(
    typeConfigMap: TypeConfigMap,
    typeName: string
  ): Array<string> {
    // Get values from Enum type
    const enumType: TypeConfig | undefined | null = _.get(
      typeConfigMap,
      typeName
    );
    if (!enumType) {
      throw new Error(
        `TypeConfig not registered in migration scope for enum type ${typeName}`
      );
    }
    const values = [];
    if (enumType.kind !== TypeKind.ENUM) {
      throw new HandlerError(
        'Can only create enum columns for fields of type Enum'
      );
    } else {
      _.forOwn(enumType.values, (valueConfig: EnumValueConfig) => {
        values.push(String(valueConfig.value));
      });
    }

    // Check if we have values
    if (!values.length) {
      throw new HandlerError('Enum type has to have at least one value');
    }

    return values.sort();
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
    scope: MigrationScope,
    tableName: string
  ) {
    if (fieldConfig.list) {
      throw new HandlerError('List is not supported for fields of type Enum');
    }

    let queryBuilder = null;
    const columnName = toColumnName(fieldName);

    const values = this._getEnumValues(scope.newTypes, fieldConfig.typeName);
    const previousValues = this._getEnumValues(
      scope.currentTypes,
      previousConfig.typeName
    );

    // Check if enum values have changed
    if (!_.isEqual(values, previousValues)) {
      const constraintName = toCheckConstraintName(tableName, [fieldName]);
      queryBuilder = db.schema.raw(
        db
          .raw(
            `alter table ?? drop constraint ??, add constraint ?? check (?? in (${values
              .map(() => '?')
              .join(', ')}))`,
            [tableName, constraintName, constraintName, columnName, ...values]
          )
          .toString()
      );
    }

    if (fieldConfig.unique && !previousConfig.unique) {
      // For content types, we need to add the locale field, so we can have
      // the same value for multiple locales
      const columns = [columnName];
      if (isContent(typeConfig) && fieldName !== 'locale') {
        columns.push(toColumnName('locale'));
      }
      queryBuilder = (
        queryBuilder || db
      ).raw(
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
      throw new HandlerError('List is not supported for fields of type Enum');
    }

    // Get values from Enum type
    const enumType: TypeConfig | undefined | null = _.get(
      scope.newTypes,
      fieldConfig.typeName
    );
    if (!enumType) {
      throw new Error(
        `TypeConfig not registered in migration scope for enum type ${fieldConfig.typeName}`
      );
    }

    const values = [];
    if (enumType.kind !== TypeKind.ENUM) {
      throw new HandlerError(
        'Can only create enum columns for fields of type Enum'
      );
    } else {
      _.forOwn(enumType.values, (valueConfig: EnumValueConfig) => {
        values.push(valueConfig.value);
      });
    }

    // Check if we have values
    if (!values.length) {
      throw new HandlerError('Enum type has to have at least one value');
    }

    // Create column builder object
    let column = table.text(toColumnName(fieldName));

    if (fieldConfig.required) {
      column = column.notNullable();
    } else {
      column = column.nullable();
    }

    // Only add index if not already created
    if (
      fieldConfig.index &&
      // Don't create index for unique fields, we already have one
      !fieldConfig.unique &&
      // Unique constraint was removed
      (previousConfig.unique || // We did not have index before
        !previousConfig.index)
    ) {
      column = column.index(toIndexName(table._tableName, [fieldName]));
    }
    // Drop index if it existed before but is not necessary any more
    if (!fieldConfig.index && previousConfig.index) {
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
            `Unknown filter operator "${operator}" for Enum field`
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
    fieldConfig: FieldConfig
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
