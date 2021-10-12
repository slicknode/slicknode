/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { ConnectionConfig, ModuleConfig } from '../../../definition';

import { PackageError } from '../../../errors';

import { RESERVED_FIELD_NAMES } from '../../../schema/identifiers';

/**
 * Ensures that the handler of the edge type is supported for connections
 *
 * @param context
 * @constructor
 */
function ConnectionValidFieldName(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModuleTypes = [];
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModuleTypes = (appConfig.types || []).map((type) => type.name);
      currentModule = appConfig;
    },

    connection: (connectionConfig: ConnectionConfig) => {
      const errorPrefix = `Relation error on field ${connectionConfig.source.typeName}.${connectionConfig.name}:`;

      // Connection is in foreign app, check for namespace
      if (!currentModuleTypes.includes(connectionConfig.source.typeName)) {
        if (
          currentModule.namespace &&
          !connectionConfig.name.startsWith(currentModule.namespace + '_')
        ) {
          context.reportError(
            new PackageError(
              `${errorPrefix} Connection field to a type of another module has to start ` +
                `with namespace "${currentModule.namespace}_"`
            )
          );
          return;
        }
      }

      // Check format
      if (
        !connectionConfig.name.match(
          /^(([A-Z]+)([a-zA-Z0-9]+)_)?([a-z]+)([a-zA-Z0-9]+)$/
        )
      ) {
        context.reportError(
          new PackageError(`${errorPrefix} Invalid field name format`)
        );
        return;
      }

      // Check for reserved field names
      if (RESERVED_FIELD_NAMES.includes(connectionConfig.name)) {
        context.reportError(
          new PackageError(
            `${errorPrefix} Cannot use reserved field name "${connectionConfig.name}"`
          )
        );
      }
    },
  };
}

export default ConnectionValidFieldName;
