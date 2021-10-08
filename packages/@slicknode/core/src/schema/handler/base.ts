/**
 * Created by Ivo Meißner on 20.11.16.
 *
 */

import _ from 'lodash';
import { Permission } from '../../auth/type';

import { getPersistedTypeExtensionMap } from '../utils';

import DataLoader from 'dataloader';

import {
  ConnectionConfig,
  ModuleConfig,
  ObjectTypeConfig,
  TypeConfig,
  TypeConfigMap,
  TypeKind,
  UnionTypeConfig,
} from '../../definition';

import Knex from 'knex';

import Context from '../../context';

export class HandlerError extends Error {}

export type MutationResolver = (
  input: {
    [x: string]: any;
  },
  context: Context
) =>
  | {
      [x: string]: any;
    }
  | Promise<any>;

export type HandlerOptions = {
  db: Knex;
  schemaName: string | undefined | null;
};

export type MigrationScope = {
  currentTypes: TypeConfigMap;
  newTypes: TypeConfigMap;
  config: HandlerOptions;
};

export const HANDLER_POSTGRES = 1;
export const HANDLER_DYNAMODB = 2;
export type HandlerType = 1 | 2;

export type MigrationAction = {
  /**
   * A creator of an action that needs to be executed before any other type migration is executed
   * For example to remove foreignKey constraints
   */
  preponedAction: () => Promise<any> | undefined | null;
  /**
   * A creator of the actual action to execute the migration on the type
   */
  action: () => Promise<any>;
  /**
   * A creator of an action that is executed after all type migrations are done within one migration
   * ForeignKey constraints can be added here that depend on other types
   */
  postponedAction: () => Promise<any> | undefined | null;
};

/**
 * An update action which could have delete, update and create actions
 */
export type MigrationUpdateAction = {
  delete?: MigrationAction;
  update?: MigrationAction;
  create?: MigrationAction;
};

/**
 * Combines multiple migration actions into a single migration action
 *
 * @param actions
 */
export function combineMigrationActions(
  actions: MigrationAction[]
): MigrationAction {
  return {
    async action() {
      for (const action of actions) {
        if (action.action) {
          await action.action();
        }
      }
    },
    async postponedAction() {
      for (const action of actions) {
        if (action.postponedAction) {
          await action.postponedAction();
        }
      }
    },
    async preponedAction() {
      for (const action of actions) {
        if (action.preponedAction) {
          await action.preponedAction();
        }
      }
    },
  };
}

/**
 * Combines multiple migration update actions into a single one
 *
 * @param actions
 */
export function combineMigrationUpdateActions(
  actions: MigrationUpdateAction[]
): MigrationUpdateAction {
  const createActions = actions.map((action) => action.create).filter((a) => a);
  const updateActions = actions.map((action) => action.update).filter((a) => a);
  const deleteActions = actions.map((action) => action.delete).filter((a) => a);
  return {
    ...(createActions.length
      ? { create: combineMigrationActions(createActions) }
      : {}),
    ...(updateActions.length
      ? { update: combineMigrationActions(updateActions) }
      : {}),
    ...(deleteActions.length
      ? { delete: combineMigrationActions(deleteActions) }
      : {}),
  };
}

export class Handler {
  /**
   * Configuration for the handler
   */
  config: HandlerOptions;

  /* eslint-disable no-unused-vars */
  constructor(config: HandlerOptions) {
    this.config = config;
  }

  /* eslint-disable no-unused-vars */
  /**
   * Migrates the modules in the data store, performs DB table updates, adds / removes indexes etc.
   *
   * @throws HandlerError
   *
   * @param newModules An array of all new modules
   * @param currentModules An array of the currently installed modules
   */
  async migrate(
    newModules: Array<ModuleConfig>,
    currentModules: Array<ModuleConfig> = []
  ): Promise<any> {
    const currentTypeMap = {};
    const newTypeMap = {};

    // Related field maps
    const currentTypeExtensionMap = getPersistedTypeExtensionMap(
      currentModules
    );
    const newTypeExtensionMap = getPersistedTypeExtensionMap(newModules);

    // Build current type map
    _.each(currentModules, (appConfig: ModuleConfig) => {
      _.each(appConfig.types || [], (typeConfig: TypeConfig) => {
        if (
          currentTypeExtensionMap.hasOwnProperty(typeConfig.name) &&
          typeConfig.kind === TypeKind.OBJECT
        ) {
          currentTypeMap[typeConfig.name] = {
            ...typeConfig,
            fields: {
              // Add related persisted fields to type map
              ...currentTypeExtensionMap[typeConfig.name],
              ...typeConfig.fields,
            },
          };
        } else {
          currentTypeMap[typeConfig.name] = typeConfig;
        }
      });
    });

    // Build new type map
    _.each(newModules, (appConfig: ModuleConfig) => {
      _.each(appConfig.types || [], (typeConfig: TypeConfig) => {
        if (
          newTypeExtensionMap.hasOwnProperty(typeConfig.name) &&
          typeConfig.kind === TypeKind.OBJECT
        ) {
          newTypeMap[typeConfig.name] = {
            ...typeConfig,
            fields: {
              // Add related persisted fields to type map
              ...newTypeExtensionMap[typeConfig.name],
              ...typeConfig.fields,
            },
          };
        } else {
          newTypeMap[typeConfig.name] = typeConfig;
        }
      });
    });

    const scope = {
      newTypes: newTypeMap,
      currentTypes: currentTypeMap,
      config: this.config,
    };

    // Remove types
    const deletedActions = [];
    _.forOwn(currentTypeMap, (typeConfig: TypeConfig) => {
      if (typeConfig.kind === TypeKind.OBJECT) {
        // Ignore types with other handlers
        if (
          !typeConfig.handler ||
          typeConfig.handler.kind !== HANDLER_POSTGRES
        ) {
          return;
        }
        if (!_.has(newTypeMap, typeConfig.name)) {
          deletedActions.push(this.deleteType({ typeConfig, scope }));
        }
      }
    });

    // Create types
    const writeActions = [];
    _.forOwn(newTypeMap, (typeConfig: TypeConfig) => {
      // Only migrate object types
      if (typeConfig.kind === TypeKind.OBJECT) {
        // Ignore types with other handlers
        if (
          !typeConfig.handler ||
          typeConfig.handler.kind !== HANDLER_POSTGRES
        ) {
          return;
        }
        // Type is new, create it
        if (!_.has(currentTypeMap, typeConfig.name)) {
          writeActions.push(this.createType({ typeConfig, scope }));
        } else if (typeConfig !== currentTypeMap[typeConfig.name]) {
          // Type exists in current type map, so update
          const updateAction = this.updateType({ typeConfig, scope });
          if (updateAction.update) {
            writeActions.push(updateAction.update);
          }
          if (updateAction.create) {
            writeActions.push(updateAction.create);
          }
          if (updateAction.delete) {
            deletedActions.push(updateAction.delete);
          }
        }
      }
    });

    try {
      // Get all dependency and type actions to be executed for deletion
      const deletedActionsPreponed = [];
      const deletedActionsPostponed = [];
      const deletedActionsMain = [];
      _.each(deletedActions, (action: MigrationAction) => {
        if (action.postponedAction) {
          deletedActionsPostponed.push(action.postponedAction);
        }
        if (action.preponedAction) {
          deletedActionsPreponed.push(action.preponedAction);
        }
        deletedActionsMain.push(action.action);
      });

      // Execute deletion of types and dependencies
      const combinedDeleteAction = async () => {
        await Promise.all(deletedActionsPreponed.map((act) => act()));
        await Promise.all(deletedActionsMain.map((act) => act()));
        await Promise.all(deletedActionsPostponed.map((act) => act()));
      };

      // Execute deletion of types and fields
      await combinedDeleteAction();

      // Execute preponed create actions
      await Promise.all(
        _.filter(
          _.map(writeActions, (action) =>
            action.preponedAction ? action.preponedAction() : null
          ),
          (action) => action
        )
      );

      // Execute main create actions
      await Promise.all(_.map(writeActions, (action) => action.action()));

      // Execute postponed create actions
      await Promise.all(
        _.filter(
          _.map(writeActions, (action) =>
            action.postponedAction ? action.postponedAction() : null
          ),
          (action) => action
        )
      );
    } catch (e) {
      // @TODO: Error handling
      throw e;
    }
  }

  /**
   * Validates if the node with the given id matches any of the provided permissions
   *
   * @param ids
   * @param permissions
   * @param typeConfig
   * @param context
   * @param preview
   * @param locale
   * @returns {Promise.<void>}
   */
  static async hasPermission(
    ids: string[],
    permissions: Array<Permission>,
    typeConfig: ObjectTypeConfig,
    context: Context,
    preview: boolean = false,
    locale: string | null = null
  ): Promise<boolean> {
    throw new Error('Function hasPermission is not implemented on handler');
  }

  /**
   * Returns a promise that creates an object and stores it in the DB
   * The resolve function returns the created object
   *
   * @param typeConfig
   * @param values
   * @param context
   * @param preview
   */
  static create(
    typeConfig: ObjectTypeConfig,
    values: {
      [x: string]: any;
    },
    context: Context,
    preview: boolean = false
  ): Promise<any> {
    throw new Error('Function create is not implemented on handler');
  }

  /**
   * Returns a promise that updates an object in the DB
   * The resolve function returns the updated object
   *
   * @param typeConfig
   * @param id
   * @param values
   * @param context
   * @param preview
   * @param locale
   */
  static update(
    typeConfig: ObjectTypeConfig,
    id: string,
    values: {
      [x: string]: any;
    },
    context: Context,
    preview: boolean = false
  ): Promise<any> {
    throw new Error('Function update is not implemented on handler');
  }

  /**
   * Returns a promise that inserts (or updates on unique constraint conflict) an object in the DB
   * The resolve function returns the updated/inserted object
   *
   * @param typeConfig
   * @param values
   * @param context
   * @param preview
   */
  static upsert(
    typeConfig: ObjectTypeConfig,
    values: {
      [x: string]: any;
    },
    context: Context,
    preview: boolean = false
  ): Promise<any> {
    throw new Error('Function upsert is not implemented on handler');
  }

  /**
   * Returns a promise that publishes an object to a new status
   * The resolve function returns the published objects
   *
   * @param params
   */
  static async publish(params: {
    typeConfig: ObjectTypeConfig;
    ids: string[]; // Ids to publish
    status: string; // Name of the status
    context: Context;
    permissions: Permission[]; // The permission filters to apply
  }): Promise<any[]> {
    throw new Error('Function publish is not implemented on handler');
  }

  /**
   * Returns a promise that unpublishes an object
   * The resolve function returns the unpublished objects
   *
   * @param params
   */
  static async unpublish(params: {
    typeConfig: ObjectTypeConfig;
    ids: string[]; // Ids to publish
    context: Context;
    permissions: Permission[]; // The permission filters to apply
  }): Promise<any[]> {
    throw new Error('Function publish is not implemented on handler');
  }

  /**
   * Returns a promise that deletes the entries where the given values match, usually {id: 'pkID123'}
   * If a function is provided as where clause, this needs to match the function signature that can be passed to
   * knexQueryBuilder.where(<arg>);
   * Resolves the deleted nodes if returnNodes = true, otherwise the number of deleted records
   *
   * @param typeConfig
   * @param where
   * @param context
   * @param returnNodes
   * @param preview // Delete node from preview storage
   */
  static delete(
    typeConfig: ObjectTypeConfig,
    where: {
      [x: string]: any;
    },
    context: Context,
    returnNodes: boolean = false,
    preview: boolean = false
  ): Promise<Array<any> | number> {
    throw new Error('Function delete is not implemented on handler');
  }

  /**
   * Returns the dataloader to get nodes of the given type
   *
   * @param typeConfig
   * @param context
   * @param keyField The field on the object that is the key, default is the "id"
   * @param preview // Get loader for preview storage
   * @param locale // Get loader for specific locale
   */
  static getLoader(
    typeConfig: ObjectTypeConfig | UnionTypeConfig,
    context: Context,
    keyField: string = 'id',
    preview: boolean = false,
    locale: string | null = null
  ): DataLoader<any, any> {
    throw new Error('Function getLoader is not implemented on handler');
  }

  /**
   * Returns a promise that returns the searched object or NULL
   * If more than one column is returned by the datastore, the first element
   * will be resolved
   *
   * @param typeConfig
   * @param where An object of filters to be applied to the query in the form {fieldName: value}
   *  If a function is supplied, this needs to match the behavior of knex.where(<passedFunction>)
   * @param context
   * @param preview
   * @param locale
   */
  static find(
    typeConfig: ObjectTypeConfig,
    where:
      | {
          [x: string]: any;
        }
      | Function,
    context: Context,
    preview: boolean = false
  ): Promise<
    | {
        [x: string]: any;
      }
    | undefined
    | null
  > {
    throw new Error('Function find is not implemented on handler');
  }

  /**
   * Returns a promise that returns the searched objects
   *
   * @param typeConfig
   * @param where An object of filters to be applied to the query in the form {fieldName: value}
   *  If a function is supplied, this needs to match the behavior of knex.where(<passedFunction>)
   * @param context
   * @param preview
   */
  static fetchAll(
    typeConfig: ObjectTypeConfig,
    where:
      | {
          [x: string]: any;
        }
      | Function,
    context: Context,
    preview: boolean = false
  ): Promise<
    Array<{
      [x: string]: any;
    }>
  > {
    throw new Error('Function fetchAll is not implemented on handler');
  }

  /**
   * Creates a DataLoader instance for the given connection
   * The batchLoadFn of the data loader is called with Array<ConnectionLoaderArgs>
   *
   * @param config
   * @param context
   * @param preview
   * @param locale
   */
  static getConnectionLoader(
    config: ConnectionConfig,
    context: Context,
    preview: boolean = false,
    locale: string | null = null
  ): DataLoader<any, any> {
    throw new Error('Function find is not implemented on handler');
  }

  /**
   * Returns the remaining number of nodes / total records for the given object type
   * @param params
   */
  static getRecordLimit(params: {
    typeConfig: ObjectTypeConfig;
    context: Context;
  }): Promise<{
    // Total remaining number of all records within limits
    total: number;
    // Remaining number of allowed nodes within limits
    nodes: number;
  }> {
    throw new Error('Function getRecordLimit is not implemented on handler');
  }

  /**
   * Deletes the type
   * @param params
   */
  deleteType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationAction {
    throw new Error('Function deleteType is not implemented on handler');
  }

  /**
   * Creates the type
   * @param params
   */
  createType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationAction {
    throw new Error('Function createType is not implemented on handler');
  }

  /**
   * Updates an existing type
   * @param params
   */
  updateType(params: {
    typeConfig: TypeConfig;
    scope: MigrationScope;
  }): MigrationUpdateAction {
    throw new Error('Function updateType is not implemented on handler');
  }
  /* eslint-enable no-unused-vars */
}
