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

import { InputElementType } from '../../../definition/InputElementType';

/**
 * Checks if the input element is supported for the type of the field
 *
 * @param context
 * @constructor
 */
function InputElementSupported(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModule;
  let currentType;

  function field(configMap: FieldConfigMap) {
    // Check reserved names
    Object.keys(configMap).forEach((name) => {
      const config = configMap[name];

      if (config.inputElementType) {
        let supported = false;
        switch (config.typeName) {
          case 'String': {
            supported = [
              InputElementType.TEXT,
              InputElementType.TEXTAREA,
              InputElementType.PASSWORD,
              InputElementType.MARKDOWN,
            ].includes(config.inputElementType);
            break;
          }
        }

        if (!supported) {
          context.reportError(
            new PackageError(
              `The input type "${String(
                config.inputElementType
              )}" for the @input directive is not supported on fields ` +
                `of type "${config.typeName}".`,
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

    typeExtensions: (config: TypeExtensionConfigMap) => {
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
        field(config[typeName]);
      });
    },
  };
}

export default InputElementSupported;
