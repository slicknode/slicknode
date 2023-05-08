import {
  MigrationAction,
  MigrationScope,
  MigrationUpdateAction,
} from '../../base';
import {
  FieldConfig,
  FieldConfigMap,
  ObjectTypeConfig,
  TypeConfig,
  TypeKind,
} from '../../../../definition';
import _ from 'lodash';
import type { Knex } from 'knex';
import AbstractFieldHandler from '../fields/AbstractFieldHandler';
import * as fields from '../fields';
import { deleteAutoCompleteIndex } from './deleteAutoCompleteIndex';
import { getFieldHandler } from '../getFieldHandler';
import { updateIndexes } from './updateIndexes';
import { createAutoCompleteIndex } from './createAutoCompleteIndex';

/**
 * Updates a type table
 * @param params
 */
export function updateTypeTable(params: {
  tableName: string;
  scope: MigrationScope;
  typeConfig: ObjectTypeConfig;
  currentTypeConfig?: ObjectTypeConfig;
}): MigrationUpdateAction {
  const { tableName, scope, typeConfig } = params;
  // Check if type exists in current scope
  if (
    !scope.currentTypes.hasOwnProperty(typeConfig.name) &&
    !params.currentTypeConfig
  ) {
    throw new Error(
      `Update failed: The type ${typeConfig.name} does not exist`
    );
  }

  // Check if kind is changed
  const currentTypeConfig =
    params.currentTypeConfig || scope.currentTypes[typeConfig.name];
  if (currentTypeConfig.kind !== typeConfig.kind) {
    throw new Error('Cannot change kind of type');
  }

  // Find fields to be removed
  const deletedFields: Array<string> = _.pullAll(
    _.keys(currentTypeConfig.fields),
    _.keys(typeConfig.fields)
  );

  // Determine which fields already exist and have changed
  const addedFields: Array<string> = [];
  const changedFields: Array<string> = [];
  const comparedFieldAttributes: Array<string> = [
    'index',
    'unique',
    'required',
    'list',
    'typeName',
    'defaultValue',
    'storageType',
  ];

  _.keys(typeConfig.fields).forEach((fieldName) => {
    // Field is not existent and needs to be added
    if (!currentTypeConfig.fields.hasOwnProperty(fieldName)) {
      addedFields.push(fieldName);
      return;
    }

    // Check if field type is enum type and check if values changed
    const fieldTypeConfig: TypeConfig | undefined | null =
      scope.newTypes[typeConfig.fields[fieldName].typeName];
    let enumValuesChanged = false;
    if (fieldTypeConfig && fieldTypeConfig.kind === TypeKind.ENUM) {
      const currentFieldTypeConfig: TypeConfig | undefined | null =
        scope.currentTypes[typeConfig.fields[fieldName].typeName];
      if (!currentFieldTypeConfig) {
        enumValuesChanged = true;
      } else if (currentFieldTypeConfig.kind === TypeKind.ENUM) {
        const toValues = Object.keys(fieldTypeConfig.values);
        const fromValues = Object.keys(currentFieldTypeConfig.values);
        enumValuesChanged = !_.isEmpty(_.xor(fromValues, toValues));
      }
    }

    if (
      // Check if field value has changed
      (currentTypeConfig.fields !== typeConfig.fields &&
        comparedFieldAttributes.some((attrName: string) => {
          return (
            typeConfig.fields[fieldName][attrName] !==
            currentTypeConfig.fields[fieldName][attrName]
          );
        })) ||
      // Also update field (constraints) if enum values have changed
      enumValuesChanged
    ) {
      // Check if type changed
      if (
        typeConfig.fields[fieldName].typeName !==
        currentTypeConfig.fields[fieldName].typeName
      ) {
        throw new Error(
          `Cannot change type of field ${fieldName} to ${typeConfig.fields[fieldName].typeName}`
        );
      }
      changedFields.push(fieldName);
    }
  });

  // Get composite index update action
  const compositeIndexAction = updateIndexes({
    typeConfig,
    scope,
    tableName,
    currentTypeConfig,
  });

  // Check if autocomplete index has changed
  const autoCompleteIndexChanged = _.isEqual(
    typeConfig.autoCompleteFields,
    currentTypeConfig.autoCompleteFields
  );

  // Only run migration if something has changed
  if (
    !deletedFields.length &&
    !changedFields.length &&
    !addedFields.length &&
    !compositeIndexAction &&
    !autoCompleteIndexChanged
  ) {
    return {};
  }

  // Update table
  const db: Knex = scope.config.db;
  const fieldMap: FieldConfigMap = typeConfig.fields;

  // Put actions in right execution order
  let deleteAction = null;
  let createAction = null;
  let updateAction = null;
  let updatePostponedAction = null;
  let createPostponedAction = null;

  // Add migration for changing fields
  if (changedFields.length) {
    updateAction = () =>
      db.schema.alterTable(tableName, (table) => {
        // Update changed fields
        changedFields.forEach((fieldName: string) => {
          getFieldHandler(fieldMap[fieldName], scope).updateField(
            table,
            fieldName,
            fieldMap[fieldName],
            currentTypeConfig.fields[fieldName],
            scope
          );
        });
      });
    // Check if we have updated field dependencies
    updatePostponedAction = () => {
      const postponedUpdateActions = [];
      changedFields.forEach((fieldName: string) => {
        const handler = getFieldHandler(fieldMap[fieldName], scope);
        if (handler.updateFieldDependencies) {
          postponedUpdateActions.push(
            handler.updateFieldDependencies(
              db,
              typeConfig,
              fieldName,
              fieldMap[fieldName],
              currentTypeConfig.fields[fieldName],
              scope,
              tableName
            )
          );
        }
      });

      return Promise.all(postponedUpdateActions);
    };
  }

  // Add migration for adding fields
  if (addedFields.length || compositeIndexAction || autoCompleteIndexChanged) {
    createAction = () => {
      if (!addedFields.length) {
        return;
      }
      return db.schema.alterTable(tableName, (table) => {
        // Add new fields
        addedFields.forEach((fieldName: string) => {
          const fieldConfig: FieldConfig = fieldMap[fieldName];
          getFieldHandler(fieldConfig, scope).createField(
            table,
            fieldName,
            fieldConfig,
            scope
          );
        });
      });
    };

    // Check if we have added field dependencies
    createPostponedAction = () => {
      const postponedCreateActions = [];
      addedFields.forEach((fieldName: string) => {
        const handler = getFieldHandler(fieldMap[fieldName], scope);
        if (handler.createFieldDependencies) {
          postponedCreateActions.push(
            handler.createFieldDependencies(
              db,
              typeConfig,
              fieldName,
              fieldMap[fieldName],
              scope,
              tableName
            )
          );
        }
      });

      // Add composite index create action
      if (compositeIndexAction && compositeIndexAction.action) {
        postponedCreateActions.push(compositeIndexAction.action());
      }

      // Add autocomplete index
      if (autoCompleteIndexChanged && typeConfig.autoCompleteFields) {
        postponedCreateActions.push(async () => {
          await createAutoCompleteIndex({ typeConfig, scope, tableName });
        });
      }

      return Promise.all(postponedCreateActions);
    };
  }

  // Add migration for removing fields
  if (
    deletedFields.length ||
    compositeIndexAction ||
    autoCompleteIndexChanged
  ) {
    deleteAction = () => {
      const deleteActions = [];

      // Delete composite indexes
      if (compositeIndexAction && compositeIndexAction.preponedAction) {
        deleteActions.push(compositeIndexAction.preponedAction());
      }

      // Delete autocomplete index
      if (autoCompleteIndexChanged) {
        deleteActions.push(async () => {
          await deleteAutoCompleteIndex({
            typeConfig: currentTypeConfig,
            scope,
            tableName,
          });
        });
      }

      // Delete fields
      if (deletedFields.length) {
        deleteActions.push(
          db.schema.alterTable(tableName, (table) => {
            // Drop columns of fields that were removed
            deletedFields.forEach((fieldName: string) => {
              const fieldConfig: FieldConfig =
                currentTypeConfig.fields[fieldName];
              const handler: AbstractFieldHandler = getFieldHandler(
                fieldConfig,
                scope
              );

              // If the type of the field was deleted in the same migration, fields will already be deleted
              // by deleteType in the right order cleaning up FK constraints, so ignore here
              if (
                [fields.RelatedObject, fields.Content].includes(
                  handler as any
                ) &&
                !scope.newTypes.hasOwnProperty(fieldConfig.typeName)
              ) {
                return;
              }

              handler.deleteField(table, fieldName, fieldConfig);
            });
          })
        );
      }

      return Promise.all(deleteActions);
    };
  }

  // Assemble migration action object
  const migrationAction: MigrationUpdateAction = {};
  if (createAction) {
    migrationAction.create = {
      action: createAction,
      postponedAction: createPostponedAction,
      preponedAction: null,
    };
  }
  if (deleteAction) {
    migrationAction.delete = {
      action: async () => await Promise.resolve(),
      postponedAction: null,
      preponedAction: deleteAction,
    };
  }
  if (updateAction) {
    migrationAction.update = {
      action: updateAction,
      postponedAction: updatePostponedAction,
      preponedAction: null,
    };
  }

  return migrationAction;
}
