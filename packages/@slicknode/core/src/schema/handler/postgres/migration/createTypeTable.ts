import _ from 'lodash';
import { FieldConfig, ObjectTypeConfig, TypeKind } from '../../../../definition';
import AbstractFieldHandler from '../fields/AbstractFieldHandler';
import { MigrationAction, MigrationScope } from '../../base';
import { getFieldHandler } from '../getFieldHandler';
import { createAutoCompleteIndex } from './createAutoCompleteIndex';
import { updateIndexes } from './updateIndexes';

export function createTypeTable(params: {
  tableName: string;
  scope: MigrationScope;
  typeConfig: ObjectTypeConfig;
}): MigrationAction {
  const { scope, typeConfig, tableName } = params;
  const db = scope.config.db;

  // Create table for type
  const action = () =>
    db.schema.createTable(tableName, (table) => {
      _.forOwn(
        typeConfig.fields,
        (fieldConfig: FieldConfig, fieldName: string) => {
          const handler: AbstractFieldHandler = getFieldHandler(
            fieldConfig,
            scope
          );
          handler.createField(table, fieldName, fieldConfig, scope);
        }
      );
    });

  const postponedAction = async () => {
    const postponedActions = [];
    _.forOwn(
      typeConfig.fields,
      (fieldConfig: FieldConfig, fieldName: string) => {
        const handler: AbstractFieldHandler = getFieldHandler(
          fieldConfig,
          scope
        );
        if (handler.createFieldDependencies) {
          const postponedActionPromise = handler.createFieldDependencies(
            db,
            typeConfig,
            fieldName,
            fieldConfig,
            scope,
            tableName
          );
          if (postponedActionPromise) {
            postponedActions.push(postponedActionPromise);
          }
        }
      }
    );

    // Create autocomplete index for type
    if (typeConfig.kind === TypeKind.OBJECT && typeConfig.autoCompleteFields) {
      postponedActions.push(
        createAutoCompleteIndex({
          typeConfig,
          scope,
          tableName,
        })
      );
    }

    // Create composite indexes
    if (typeConfig.indexes) {
      const compositeIndexAction = updateIndexes({
        typeConfig,
        scope,
        tableName,
      });
      if (compositeIndexAction) {
        postponedActions.push(compositeIndexAction.action());
      }
    }

    return await Promise.all(postponedActions); // .then(resolve).catch(reject);
  };

  return {
    action,
    postponedAction,
    preponedAction: null,
  };
}
