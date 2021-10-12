/**
 * Created by Ivo Meißner on 12.04.17.
 *
 */

import {
  ModuleConfig,
  TypeConfig,
  TypeConfigMap,
  FieldConfig,
  TypeKind,
} from '../definition';

import _ from 'lodash';

import deepEquals from 'deep-equal';

/**
 * Determines a new semver version based on the provided app configs
 *
 * @param from The current app config
 * @param to The new app config
 */
export function getNewSemverVersion(
  from: ModuleConfig,
  to: ModuleConfig
): string {
  // Get current version
  const [major, minor, patch] = from.version.split('.').map(Number);
  let majorUpdate = false;
  let minorUpdate = false;

  // Check if GraphQL Schema has breaking change
  const currentTypeMap: TypeConfigMap = (from.types || []).reduce(
    (map, config: TypeConfig) => {
      map[config.name] = config;
      return map;
    },
    {}
  );
  const newTypeMap: TypeConfigMap = (to.types || []).reduce(
    (map, config: TypeConfig) => {
      map[config.name] = config;
      return map;
    },
    {}
  );

  // Check if types were deleted
  const removedTypes = _.omit(currentTypeMap, _.keys(newTypeMap));
  if (_.keys(removedTypes).length > 0) {
    majorUpdate = true;
  }

  // Check if we have changes in types
  (to.types || []).forEach((typeConfig: TypeConfig) => {
    // Type was added
    if (!currentTypeMap.hasOwnProperty(typeConfig.name)) {
      minorUpdate = true;
      return;
    }
    const currentType: TypeConfig = currentTypeMap[typeConfig.name];

    // Check if type was changed
    if (typeConfig === currentType || deepEquals(typeConfig, currentType)) {
      return;
    }

    // Check if change was breaking
    if (typeConfig.kind !== currentType.kind) {
      majorUpdate = true;
      return;
    }
    if (
      typeConfig.deprecationReason !== null &&
      currentType.deprecationReason === null
    ) {
      minorUpdate = true;
    }
    switch (typeConfig.kind) {
      case TypeKind.INTERFACE:
        if (
          typeConfig.kind === TypeKind.INTERFACE &&
          currentType.kind === TypeKind.INTERFACE
        ) {
          // Check if existing fields were removed
          majorUpdate =
            majorUpdate ||
            _.keys(currentType.fields).some((name: string) => {
              return !typeConfig.fields.hasOwnProperty(name);
            });

          // Check new type fields
          (_.forOwn as any)(
            typeConfig.fields as any,
            (name: string, fieldConfig: FieldConfig) => {
              // Field was added
              if (!currentType.fields.hasOwnProperty(name)) {
                if (fieldConfig.required) {
                  majorUpdate = true;
                } else {
                  minorUpdate = true;
                }
              }

              // Check if anything changed
              const currentFieldConfig: FieldConfig = currentType.fields[name];
              if (
                currentFieldConfig === fieldConfig ||
                deepEquals(currentFieldConfig, fieldConfig)
              ) {
                return;
              }
              // Check if change was breaking
              if (
                fieldConfig.unique !== currentFieldConfig.unique ||
                (fieldConfig.required && !currentFieldConfig.required) ||
                fieldConfig.list !== currentFieldConfig.list ||
                fieldConfig.typeName !== currentFieldConfig.typeName
              ) {
                majorUpdate = true;
                return;
              }
              // Check if we have minor version change
              if (
                fieldConfig.deprecationReason !== null &&
                currentFieldConfig.deprecationReason === null
              ) {
                minorUpdate = true;
              }

              // Check if we have argument changes in field
              if (
                fieldConfig.arguments !== currentFieldConfig.arguments &&
                deepEquals(fieldConfig.arguments, currentFieldConfig.arguments)
              ) {
                // Check if argument was removed
                _.forOwn(
                  currentFieldConfig.arguments || ({} as any),
                  (argName: string) => {
                    // Argument was removed
                    if (
                      !(fieldConfig.arguments || {}).hasOwnProperty(argName)
                    ) {
                      majorUpdate = true;
                    }
                  }
                );

                // @TODO: Implement further change, add checks
              }
            }
          );
        } else {
          majorUpdate = true;
          return;
        }
        break;
      case TypeKind.OBJECT:
        break;
      case TypeKind.UNION:
        break;
      default:
        throw new Error(
          `Cannot determine semver version for type of kind ${typeConfig.kind}`
        );
    }
  });

  // @FIXME: For now we just do majorUpdate every time
  majorUpdate = true;

  return [
    majorUpdate ? major + 1 : major,
    majorUpdate ? 0 : minorUpdate ? minor + 1 : minor,
    majorUpdate ? 0 : minorUpdate ? 0 : patch + 1,
  ].join('.');
}
