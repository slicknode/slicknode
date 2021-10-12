import {
  FieldConfig,
  isContent,
  isContentUnion,
  ObjectTypeConfig,
  TypeConfig,
  TypeKind,
} from '../../../../definition';
import { MigrationAction, MigrationScope } from '../../base';
import _ from 'lodash';
import toTableName, { TableType } from '../toTableName';
import { getFieldHandler } from '../getFieldHandler';

/**
 * Deletes the table for the type
 * @param params
 */
export function deleteTypeTable(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
  tableType: TableType;
}): MigrationAction {
  const { typeConfig, scope, tableType } = params;
  const tableName = toTableName(typeConfig, scope.config.schemaName, tableType);
  const preponedAction = async () => {
    const dependencies = [];

    // Find dependent fields recursively
    _.forOwn(scope.currentTypes, (relatedTypeConfig: TypeConfig) => {
      if (relatedTypeConfig.kind === TypeKind.OBJECT) {
        if (relatedTypeConfig.name === typeConfig.name) {
          return;
        }

        // If we have non-default TableType and related type is not ContentNode,
        // there are no references since they will be handled by the deletion of the default table type
        if (tableType !== TableType.DEFAULT && !isContent(relatedTypeConfig)) {
          return;
        }

        const matchingFields = {};
        _.forOwn(
          relatedTypeConfig.fields,
          (fieldConfig: FieldConfig, fieldName: string) => {
            // Check if field is related
            if (fieldConfig.typeName === typeConfig.name) {
              matchingFields[fieldName] = fieldConfig;
            }
          }
        );

        // Remove dependent fields
        if (Object.keys(matchingFields).length) {
          const dependencyPromise = scope.config.db.schema.table(
            toTableName(relatedTypeConfig, scope.config.schemaName, tableType),
            (table) => {
              _.forOwn(
                matchingFields,
                (fieldConfig: FieldConfig, fieldName: string) => {
                  const handler = getFieldHandler(fieldConfig, scope);
                  handler.deleteField(table, fieldName, fieldConfig);
                }
              );
            }
          );
          dependencies.push(dependencyPromise);
        }
      }
    });
    return await Promise.all(dependencies);
  };

  const action = () => scope.config.db.schema.dropTableIfExists(tableName);

  return {
    postponedAction: null,
    preponedAction,
    action,
  };
}
