/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { TypeConfig, ModuleConfig, FieldConfigMap } from '../../../definition';

import { ModuleKind, TypeKind } from '../../../definition';

import { PackageError } from '../../../errors';
import { RESERVED_FIELD_NAMES } from '../../../schema/identifiers';

/**
 * Checks if the field name is a reserved identifier
 *
 * @param context
 * @constructor
 */
function ReservedFieldName(context: ValidationContext): ValidationRuleConfig {
  let currentModule;
  let currentType;

  function field(config: FieldConfigMap) {
    // Check reserved names
    Object.keys(config).forEach((name) => {
      if (
        currentModule.kind !== ModuleKind.NATIVE &&
        RESERVED_FIELD_NAMES.includes(name) &&
        (
          (currentType.kind === TypeKind.OBJECT && currentType.interfaces) ||
          []
        ).includes('Node')
      ) {
        context.reportError(
          new PackageError(
            `"${name}" is a reserved field name. Choose a different name for the field on type ${currentType.name}`,
            currentModule.id,
            ['types', currentType.name, name]
          )
        );
      }
    });
  }

  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      currentType = config;
    },

    field,

    typeExtensions: (config: { [typeName: string]: FieldConfigMap }) => {
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

export default ReservedFieldName;
