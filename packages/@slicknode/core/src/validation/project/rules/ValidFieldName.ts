/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  FieldConfigMap,
  ModuleConfig,
  ModuleKind,
  TypeConfig,
} from '../../../definition';

import { PackageError } from '../../../errors';

const FIELD_REGEX = /^([a-z]+)([a-zA-Z0-9]+)$/;
const RELATED_FIELD_REGEX = /^(([A-Z]+)([a-zA-Z0-9]+)_)?([a-z]+)([a-zA-Z0-9]+)$/;

/**
 * Checks if the type name matches the naming conventions
 *
 * @param context
 * @constructor
 */
function ValidFieldName(context: ValidationContext): ValidationRuleConfig {
  let currentModule: ModuleConfig;
  let currentType = null;
  let extendedTypeName = null;
  let appTypeNames = null;
  let isForeignModuleType = false;

  function field(config: FieldConfigMap) {
    if (currentType) {
      // Check field names for typeConfig fields
      Object.keys(config).forEach((name) => {
        if (
          !name.match('^([a-z]+)([a-zA-Z0-9]+)$') &&
          currentModule.kind !== ModuleKind.NATIVE
        ) {
          context.reportError(
            new PackageError(
              `Invalid field name "${name}". Field names have to start with a lowercase letter and can only contain alphanumeric characters`,
              currentModule.id,

              ['types', currentType.name, name]
            )
          );
        }
      });
    } else {
      // Check fieldName for related fields
      const pattern = isForeignModuleType ? RELATED_FIELD_REGEX : FIELD_REGEX;
      Object.keys(config).forEach((name) => {
        // Check if fieldName starts with namespace
        if (isForeignModuleType && currentModule.namespace) {
          if (
            currentModule.namespace &&
            !name.startsWith(currentModule.namespace + '_')
          ) {
            context.reportError(
              new PackageError(
                `Invalid field name "${name}". A field in a type extension of another app has to start ` +
                  `with the namespace "${currentModule.namespace}_"`
              )
            );
            return;
          }
        }

        if (!name.match(pattern) && currentModule.kind !== ModuleKind.NATIVE) {
          context.reportError(
            new PackageError(
              `Invalid field name "${name}". Field names have to start with a lowercase letter and can only contain alphanumeric characters`,
              currentModule.id,
              ['types', extendedTypeName || '', name]
            )
          );
        }
      });
    }
  }
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
      if (currentModule.types && currentModule.types.length) {
        appTypeNames = currentModule.types.map((type) => type.name);
      } else {
        appTypeNames = null;
      }
    },

    field,
    type: {
      enter: (config: TypeConfig) => {
        currentType = config;
      },
      leave: () => {
        currentType = null;
      },
    },

    typeExtensions: {
      enter: (config: { [typeName: string]: FieldConfigMap }) => {
        extendedTypeName = Object.keys(config)[0] || null;
        isForeignModuleType =
          extendedTypeName === 'Query' ||
          !(appTypeNames || []).includes(extendedTypeName);

        // Run validation for each type
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

          field(config[typeName]);
        });
      },
      leave: () => {
        extendedTypeName = null;
        isForeignModuleType = false;
      },
    },
  };
}

export default ValidFieldName;
