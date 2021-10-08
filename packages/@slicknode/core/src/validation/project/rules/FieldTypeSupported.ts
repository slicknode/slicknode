/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

/* eslint-disable max-len */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  FieldConfigMap,
  isContent,
  isContentUnion,
  isNode,
  isObjectTypeConfig,
  ModuleConfig,
  ModuleKind,
  TypeExtensionConfigMap,
  UnionTypeConfig,
  TypeConfig,
  TypeKind,
} from '../../../definition';
import _ from 'lodash';

import { PackageError } from '../../../errors';
import { builtInTypes } from '../../../schema/builder';
import { BaseTypeConfig } from '../../../definition/BaseTypeConfig';

/**
 * Checks if the type of the field is supported by the handler
 * This should eventually be moved to the specific handlers' field handlers.
 *
 * Right now we just use validation for PostgresHandler and ModuleKind.DYNAMIC
 * to validate types. Native modules are not validated.
 *
 * @param context
 * @constructor
 */
function FieldTypeSupported(context: ValidationContext): ValidationRuleConfig {
  let currentModule: ModuleConfig;
  let currentType: TypeConfig;

  function validateFieldType(fieldType: TypeConfig, fieldName: string) {
    // All types for custom resolvers are supported
    if (
      currentType.kind === TypeKind.OBJECT &&
      currentModule.resolvers &&
      currentModule.resolvers.hasOwnProperty(currentType.name) &&
      currentModule.resolvers[currentType.name].hasOwnProperty(fieldName)
    ) {
      return;
    }

    switch (fieldType.kind) {
      case TypeKind.SCALAR:
      case TypeKind.ENUM:
        // All scalar and enum types are supported
        break;
      case TypeKind.OBJECT:
        if (
          isObjectTypeConfig(fieldType) &&
          !(fieldType.interfaces || []).includes('Node') &&
          (
            (currentType.kind === TypeKind.OBJECT && currentType.interfaces) ||
            []
          ).includes('Node')
        ) {
          context.reportError(
            new PackageError(
              `Using object types without Node interface as field types is not supported yet. "${fieldType.name}" is missing Node interface`,
              currentModule.id,
              ['types', currentType.name, fieldName]
            )
          );
        }
        break;
      case TypeKind.UNION:
        if (!isContentUnion(fieldType, context.typeMap)) {
          context.reportError(
            new PackageError(
              `All members of a union type have to implement the "Content" interface. Invalid type "${
                (fieldType as UnionTypeConfig)!.name
              }" for field "${fieldName}"`,
              currentModule.id,
              ['types', currentType.name, fieldName]
            )
          );
        }
        break;
      case TypeKind.INTERFACE:
        context.reportError(
          new PackageError(
            `Interface types as field types are not supported yet. Invalid type "${fieldType.name}" for field "${fieldName}"`,
            currentModule.id,
            ['types', currentType.name, fieldName]
          )
        );
        break;
      case TypeKind.INPUT_OBJECT:
        if (currentType.kind !== TypeKind.INPUT_OBJECT) {
          context.reportError(
            new PackageError(
              `Type "${fieldType.name}" for field "${fieldName}" is not supported`,
              currentModule.id,
              ['types', currentType.name, fieldName]
            )
          );
        }
        break;
      default:
        context.reportError(
          new PackageError(
            `Type "${
              (fieldType as BaseTypeConfig).name
            }" for field "${fieldName}" not supported.`,
            currentModule.id,
            ['types', currentType.name, fieldName]
          )
        );
    }
  }

  function field(configMap: FieldConfigMap) {
    // Check reserved names
    Object.keys(configMap).forEach((name) => {
      const config = configMap[name];
      if (currentModule.kind !== ModuleKind.NATIVE) {
        // Check if type exists in type system
        if (builtInTypes.hasOwnProperty(config.typeName)) {
          // All builtin types are supported, except ID is reserved on Nodes for field 'id'
          if (
            config.typeName === 'ID' &&
            name !== 'id' &&
            (
              (currentType.kind === TypeKind.OBJECT &&
                currentType.interfaces) ||
              []
            ).includes('Node')
          ) {
            context.reportError(
              new PackageError(
                'Type "ID" is reserved for field "id" on object types with interface "Node"',
                currentModule.id,
                ['types', currentType.name, name]
              )
            );
          }
        } else if (context.typeMap.hasOwnProperty(config.typeName)) {
          // Validate field type from typeMap
          validateFieldType(context.typeMap[config.typeName], name);
        } else if (config.typeName === currentType.name) {
          // Validate self referencing type
          validateFieldType(currentType, name);
        } else {
          context.reportError(
            new PackageError(
              `Type "${config.typeName}" for field "${name}" not found in schema`,
              currentModule.id,
              ['types', currentType.name, name]
            )
          );
        }

        // @TODO: Right now list type is not supported for all fields, when list support is added to fields,
        // test for compatibility should be added to field handlers of handler
        if (
          config.list &&
          isNode(currentType) &&
          !(
            currentModule.resolvers &&
            currentModule.resolvers.hasOwnProperty(currentType.name) &&
            currentModule.resolvers[currentType.name].hasOwnProperty(name)
          )
        ) {
          const fieldTypeConfig = context.typeMap[config.typeName];
          if (
            // No field type config (Builtin scalars etc.)
            !fieldTypeConfig ||
            // Only allow support for content nodes and content unions
            (!isContent(fieldTypeConfig) &&
              !isContentUnion(fieldTypeConfig, context.typeMap))
          ) {
            context.reportError(
              new PackageError(
                `List type is not supported yet for field "${name}". Use relations to model array values`,
                currentModule.id,
                ['types', currentType!.name, name]
              )
            );
          } else {
            if (
              _.isArray(config.list) &&
              (config.list.length !== 1 || config.list[0] === false)
            ) {
              context.reportError(
                new PackageError(
                  `Only one dimensional lists with non-NULL values are supported for field "${name}", should be: ${name}: [${
                    config.typeName
                  }!]${config.required ? '!' : ''}`,
                  currentModule.id,
                  ['types', currentType!.name, name]
                )
              );
            }
          }
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

export default FieldTypeSupported;
