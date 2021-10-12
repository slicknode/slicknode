/**
 * Created by Ivo Meißner on 23.04.17.
 */

import {
  TypeKind,
  TypeAdminConfig,
  TypeConfig,
  EnumValueAdminConfig,
} from '@slicknode/core';

import {
  pluralizeTypeName,
  unCamelCase,
  unScreamSnakeCase,
} from '@slicknode/core/build/utils/string';

import buildDefaultFieldAdmin from './buildDefaultFieldAdmin';

/**
 * Converts a TypeConfig to a TypeAdminConfig with default values
 * @param typeConfig
 * @returns {{kind: *, name: *, description: *}}
 */
function buildDefaultTypeAdmin(typeConfig: TypeConfig): TypeAdminConfig {
  switch (typeConfig.kind) {
    case TypeKind.OBJECT: {
      return {
        name: typeConfig.name,
        kind: TypeKind.OBJECT,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
        labelPlural: pluralizeTypeName(typeConfig.name),
        fields: buildDefaultFieldAdmin(typeConfig.fields),
      };
    }
    case TypeKind.INTERFACE: {
      return {
        name: typeConfig.name,
        kind: TypeKind.INTERFACE,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
        labelPlural: pluralizeTypeName(typeConfig.name),
        fields: buildDefaultFieldAdmin(typeConfig.fields),
      };
    }
    case TypeKind.SCALAR: {
      return {
        name: typeConfig.name,
        kind: TypeKind.SCALAR,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
      };
    }
    case TypeKind.ENUM: {
      return {
        name: typeConfig.name,
        kind: TypeKind.ENUM,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
        values: Object.keys(typeConfig.values).map((key) => {
          const value = typeConfig.values[key];
          const valueConfig: EnumValueAdminConfig = {
            label: unScreamSnakeCase(key),
            value: String(key),
            ...(value.description ? { description: value.description } : {}),
          };
          return valueConfig;
        }),
      };
    }
    case TypeKind.UNION: {
      return {
        name: typeConfig.name,
        kind: TypeKind.UNION,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
        labelPlural: pluralizeTypeName(typeConfig.name),
        typeNames: typeConfig.typeNames,
      };
    }
    case TypeKind.INPUT_OBJECT: {
      return {
        name: typeConfig.name,
        kind: TypeKind.INPUT_OBJECT,
        label: unCamelCase(String(typeConfig.name.split('_').pop())),
        description: typeConfig.description,
        labelPlural: pluralizeTypeName(typeConfig.name),
        fields: buildDefaultFieldAdmin(typeConfig.fields),
      };
    }
  }
}

export default buildDefaultTypeAdmin;
