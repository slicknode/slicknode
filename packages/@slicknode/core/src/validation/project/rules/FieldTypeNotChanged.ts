/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

/* eslint-disable max-len */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  TypeConfig,
  ModuleConfig,
  FieldConfigMap,
  TypeExtensionConfigMap,
} from '../../../definition';

import { PackageError } from '../../../errors';
import _ from 'lodash';

/**
 * Checks if the type of the field is changed
 *
 * @param context
 * @constructor
 */
function FieldTypeNotChanged(context: ValidationContext): ValidationRuleConfig {
  let currentModule;
  let currentType;

  function field(
    configMap: FieldConfigMap,
    previousConfigMap: FieldConfigMap | undefined | null
  ) {
    // Check reserved names
    Object.keys(configMap).forEach((name) => {
      const config = configMap[name];
      const previousConfig =
        (previousConfigMap && previousConfigMap[name]) || null;

      if (previousConfig) {
        if (
          config.typeName !== previousConfig.typeName ||
          Boolean(config.list) !== Boolean(previousConfig.list)
        ) {
          context.reportError(
            new PackageError(
              `Changing the type for field "${name}" on type "${currentType.name}" from ` +
                `"${previousConfig.typeName}" to "${config.typeName}" not supported. Delete field, run migration and ` +
                'add the new type afterwards instead (WARNING: data will be lost).',
              currentModule.id,
              ['types', currentType.name, name]
            )
          );
        }
      }
    });
  }

  return {
    app(appConfig: ModuleConfig) {
      currentModule = appConfig;
    },

    type(config: TypeConfig) {
      currentType = config;
    },

    field,

    typeExtensions: (
      config: TypeExtensionConfigMap,
      previousConfig: TypeExtensionConfigMap | undefined | null
    ) => {
      Object.keys(config).forEach((typeName) => {
        if (!context.typeMap.hasOwnProperty(typeName)) {
          context.reportError(
            new PackageError(
              `Type "${typeName}" was not found in schema and can therefore not be extended.`,
              currentModule.id,
              ['types', typeName]
            )
          );
        }
        currentType = context.typeMap[typeName];

        field(config[typeName], _.get(previousConfig, typeName));
      });
    },
  };
}

export default FieldTypeNotChanged;
