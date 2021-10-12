import * as Core from '@slicknode/core';
import * as External from '@slicknode/project-config-schema';
import { buildDefaultModuleAdmin } from './defaultAdmin';

export interface ITransformConfigParams {
  modules: Core.ModuleConfig[];
  buildDefaultAdmin?: boolean;
}

/**
 * Transforms a config from the internal core format to the external
 * format that is used in the console etc.
 *
 * @param params
 * @returns
 */
export function transformConfig(
  params: ITransformConfigParams
): {
  modules: External.ModuleConfig[];
} {
  const { modules, buildDefaultAdmin = false } = params;
  return {
    modules: modules.map((module) =>
      removeUndefinedProps(transformModuleConfig(module, buildDefaultAdmin))
    ),
  };
}

/**
 * Recursively removes all properties that have undefined as value
 * @param obj
 * @returns
 */
function removeUndefinedProps<T extends { [Key in keyof T]: any }>(obj: T): T {
  (Object.keys(obj) as Array<keyof T>).forEach((propName: keyof T) => {
    const value = obj[propName];
    if (typeof value === 'undefined') {
      delete obj[propName];
    } else if (Array.isArray(value)) {
      value.map(removeUndefinedProps);
    } else if (typeof value === 'object') {
      removeUndefinedProps(value);
    }
  });
  return obj;
}

function transformModuleConfig(
  config: Core.ModuleConfig,
  buildDefaultAdmin: boolean
): External.ModuleConfig {
  const admin = buildDefaultAdmin
    ? buildDefaultModuleAdmin(config)
    : config.admin.base;
  return {
    id: config.id,
    namespace: config.namespace,
    kind: transformModuleKind(config.kind),
    version: config.version,
    types: config.types?.map(transformType) || [],
    connections: config.connections,
    mutations: config.mutations?.map(transformMutation) || [],
    ...(config.settings
      ? { settings: transformInputObject(config.settings) }
      : {}),
    ...(config.typeExtensions
      ? { typeExtensions: transformTypeExtensionMap(config.typeExtensions) }
      : {}),
    admin: {
      base: transformModuleAdmin(admin),
    },
  };
}

function transformModuleKind(kind: Core.ModuleKind): External.ModuleKind {
  switch (kind) {
    case Core.ModuleKind.DYNAMIC:
      return External.ModuleKind.DYNAMIC;
    case Core.ModuleKind.NATIVE:
      return External.ModuleKind.NATIVE;
    default:
      throw new Error(`Invalid module kind ${kind}`);
  }
}

function transformTypeExtensionMap(
  extensions: Core.TypeExtensionConfigMap
): External.TypeExtensionConfigMap {
  return Object.keys(extensions).reduce(
    (map: External.TypeExtensionConfigMap, name: string) => {
      // Set READ access property for non persisted fields
      const fieldMapWithAccess = Object.keys(extensions[name]).reduce(
        (fieldMap: Core.FieldConfigMap, fieldName) => {
          const fieldConfig = extensions[name][fieldName];
          fieldMap[fieldName] = {
            ...fieldConfig,
            // If we have resolver, this is a READ only field
            ...(fieldConfig.resolve
              ? { access: fieldConfig.access || [Core.FieldAccess.READ] }
              : {}),
          };
          return fieldMap;
        },
        {}
      );

      const fieldMap = transformFieldMap(fieldMapWithAccess);

      map[name] = fieldMap;
      return map;
    },
    {}
  );
}

function transformMutation(
  config: Core.MutationConfig
): External.MutationConfig {
  return {
    name: config.name,
    description: config.description,
    fields: transformFieldMap(config.fields),
    inputFields: transformFieldMap(config.inputFields),
    permissions: config.permissions.map(transformPermission),
    deprecationReason: config.deprecationReason,
    inputTypeName: config.inputTypeName,
    outputTypeName: config.outputTypeName,
  };
}

function transformModuleAdmin(
  config: Core.ModuleAdminConfig
): External.ModuleAdminConfig {
  return {
    name: config.name,
    description: config.description,
    mutations: Object.keys(config.mutations).reduce(
      (mutations: External.MutationAdminConfigMap, name: string) => {
        mutations[name] = transformMutationAdmin(config.mutations[name]);
        return mutations;
      },
      {}
    ),
    pages: config.pages.map(transformPage),
    types: Object.keys(config.types).reduce(
      (map: External.TypeAdminConfigMap, name: string) => {
        map[name] = transformTypeAdmin(config.types[name]);
        return map;
      },
      {}
    ),
    ...(config.settings
      ? { settings: transformInputObjectTypeAdmin(config.settings) }
      : {}),
    typeExtensions: config.typeExtensions,
  };
}

function transformTypeAdmin(
  config: Core.TypeAdminConfig
): External.TypeAdminConfig {
  switch (config.kind) {
    case Core.TypeKind.ENUM:
      return transformEnumTypeAdmin(config);
    case Core.TypeKind.OBJECT:
      return transformObjectTypeAdmin(config);
    case Core.TypeKind.INPUT_OBJECT:
      return transformInputObjectTypeAdmin(config);
    case Core.TypeKind.UNION:
      return transformUnionTypeAdmin(config);
    case Core.TypeKind.INTERFACE:
      return transformInterfaceTypeAdmin(config);
    case Core.TypeKind.SCALAR:
      return transformScalarTypeAdmin(config);
    default:
      throw new Error('Unknown admin type config');
  }
}

function transformScalarTypeAdmin(
  config: Core.ScalarTypeAdminConfig
): External.ScalarTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.SCALAR,
  };
}

function transformInputObjectTypeAdmin(
  config: Core.InputObjectTypeAdminConfig
): External.InputObjectTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.INPUT_OBJECT,
  };
}

function transformUnionTypeAdmin(
  config: Core.UnionTypeAdminConfig
): External.UnionTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.UNION,
  };
}

function transformObjectTypeAdmin(
  config: Core.ObjectTypeAdminConfig
): External.ObjectTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.OBJECT,
  };
}

function transformInterfaceTypeAdmin(
  config: Core.InterfaceTypeAdminConfig
): External.InterfaceTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.INTERFACE,
  };
}

function transformEnumTypeAdmin(
  config: Core.EnumTypeAdminConfig
): External.EnumTypeAdminConfig {
  return {
    ...config,
    kind: External.TypeKind.ENUM,
    values: config.values,
  };
}

function transformPage(config: Core.PageConfig): External.PageConfig {
  const kindMap = {
    [Core.PageKind.OBJECT_TYPE]: External.PageKind.OBJECT_TYPE,
  };
  return {
    kind: kindMap[config.kind],
    name: config.name,
    typeName: config.typeName,
  };
}

function transformMutationAdmin(
  config: Core.MutationAdminConfig
): External.MutationAdminConfig {
  return {
    description: config.description,
    fields: transformFieldAdminMap(config.fields),
    inputFields: transformFieldAdminMap(config.inputFields),
    label: config.label,
  };
}

function transformFieldAdminMap(
  config: Core.FieldAdminConfigMap
): External.FieldAdminConfigMap {
  return Object.keys(config).reduce(
    (map: External.FieldAdminConfigMap, name: string) => {
      map[name] = transformFieldAdmin(config[name]);
      return map;
    },
    {}
  );
}

function transformFieldAdmin(
  config: Core.FieldAdminConfig
): External.FieldAdminConfig {
  return {
    description: config.description,
    label: config.label,
  };
}

function transformType(config: Core.TypeConfig): External.TypeConfig {
  switch (config.kind) {
    case Core.TypeKind.ENUM:
      return transformEnum(config);
    case Core.TypeKind.INPUT_OBJECT:
      return transformInputObject(config);
    case Core.TypeKind.OBJECT:
      return transformObject(config);
    case Core.TypeKind.INTERFACE:
      return transformInterface(config);
    case Core.TypeKind.SCALAR:
      return transformScalar(config);
    case Core.TypeKind.UNION:
      return transformUnion(config);
    default:
      throw new Error('Invalid type kind');
  }
}

function transformUnion(
  config: Core.UnionTypeConfig
): External.UnionTypeConfig {
  return {
    kind: External.TypeKind.UNION,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
    typeNames: config.typeNames,
  };
}

function transformScalar(
  config: Core.ScalarTypeConfig
): External.ScalarTypeConfig {
  return {
    kind: External.TypeKind.SCALAR,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
  };
}

function transformInterface(
  config: Core.InterfaceTypeConfig
): External.InterfaceTypeConfig {
  return {
    kind: External.TypeKind.INTERFACE,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
    fields: transformFieldMap(config.fields),
  };
}

function transformEnum(config: Core.EnumTypeConfig): External.EnumTypeConfig {
  return {
    kind: External.TypeKind.ENUM,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
    // Only expose external values to admin interface
    values: Object.keys(config.values).reduce(
      (valMap: External.EnumValueConfigMap, key) => {
        valMap[key] = {
          ...config.values[key],
          value: key,
        };
        return valMap;
      },
      {}
    ),
  };
}

function transformObject(
  config: Core.ObjectTypeConfig
): External.ObjectTypeConfig {
  return {
    kind: External.TypeKind.OBJECT,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
    autoCompleteFields: config.autoCompleteFields,
    indexes: config.indexes,
    interfaces: config.interfaces,
    permissions: config.permissions?.map(transformPermission),
    directAccess: config.directAccess,
    fields: transformFieldMap(config.fields),
    ...(config.mutations
      ? {
          mutations: {
            create: config.mutations.create?.map(transformPermission),
            update: config.mutations.update?.map(transformPermission),
            delete: config.mutations.delete?.map(transformPermission),
          },
        }
      : {}),
  };
}

function transformPermission(permission: Core.Permission): External.Permission {
  const roleMap = {
    [Core.Role.ADMIN]: External.Role.ADMIN,
    [Core.Role.ANONYMOUS]: External.Role.ANONYMOUS,
    [Core.Role.AUTHENTICATED]: External.Role.AUTHENTICATED,
    [Core.Role.FULLY_AUTHENTICATED]: External.Role.FULLY_AUTHENTICATED,
    [Core.Role.RUNTIME]: External.Role.RUNTIME,
    [Core.Role.STAFF]: External.Role.STAFF,
  };
  return {
    role: roleMap[permission.role],
    fields: permission.fields,
    query: permission.query,
  };
}

function transformInputObject(
  config: Core.InputObjectTypeConfig
): External.InputObjectTypeConfig {
  return {
    kind: External.TypeKind.INPUT_OBJECT,
    name: config.name,
    description: config.description,
    deprecationReason: config.deprecationReason,
    fields: transformFieldMap(config.fields),
  };
}

function transformFieldMap(
  fields: Core.FieldConfigMap
): External.FieldConfigMap {
  return Object.keys(fields).reduce(
    (fieldMap: External.FieldConfigMap, field: string) => {
      fieldMap[field] = transformField(fields[field]);
      return fieldMap;
    },
    {}
  );
}

function transformField(config: Core.FieldConfig): External.FieldConfig {
  return {
    typeName: config.typeName,
    access: config.access?.map((access) => {
      switch (access) {
        case Core.FieldAccess.CREATE:
          return External.FieldAccess.CREATE;
        case Core.FieldAccess.UPDATE:
          return External.FieldAccess.UPDATE;
        case Core.FieldAccess.READ:
          return External.FieldAccess.READ;
      }
    }),
    description: config.description,
    // @TODO: defaultValue
    index: config.index,
    ...(config.required ? { required: true } : {}),
    required: config.required,
    deprecationReason: config.deprecationReason,
    unique: config.unique,
    ...(config.list
      ? {
          list:
            typeof config.list === 'boolean'
              ? [Boolean(config.required)]
              : config.list,
        }
      : {}),
    inputElementType: config.inputElementType,
  };
}
