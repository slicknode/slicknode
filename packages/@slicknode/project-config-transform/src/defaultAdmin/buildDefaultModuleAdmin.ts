import {
  ModuleAdminConfig,
  ModuleConfig,
  MutationConfig,
  TypeAdminConfigMap,
  TypeConfig,
  TypeKind
} from '@slicknode/core';
import {
  MutationAdminConfigMap,
  TypeExtensionAdminConfigMap
} from '@slicknode/project-config-schema';
import buildDefaultFieldAdmin from './buildDefaultFieldAdmin';
import buildDefaultMutationAdmin from './buildDefaultMutationAdmin';
import buildDefaultTypeAdmin from './buildDefaultTypeAdmin';

/**
 * Generates a module admin config from a module config
 *
 * @param config
 * @param adminConfig If not provided, base admin config from module config is used
 * @returns
 */
export function buildDefaultModuleAdmin(
  config: ModuleConfig,
  adminConfig?: ModuleAdminConfig
): ModuleAdminConfig {
  const admin = adminConfig || config.admin.base;

  // Inject type configs into AdminTypeConfig
  const types = (config.types || []).reduce(
    (map: TypeAdminConfigMap, typeConfig: TypeConfig) => {
      map[typeConfig.name] = {
        ...(admin.types[typeConfig.name] || buildDefaultTypeAdmin(typeConfig))
      };
      return map;
    },
    {}
  );

  const mutations = (config.mutations || []).reduce(
    (map: MutationAdminConfigMap, mutationConfig: MutationConfig) => {
      map[mutationConfig.name] = {
        ...(admin.mutations[mutationConfig.name] ||
          buildDefaultMutationAdmin(mutationConfig))
      };
      return map;
    },
    {}
  );

  const settings = config.settings
    ? buildDefaultTypeAdmin(config.settings)
    : null;

  const typeExtensions = Object.keys(config.typeExtensions || {}).reduce(
    (map: TypeExtensionAdminConfigMap, typeName: string) => {
      map[typeName] = {
        fields: buildDefaultFieldAdmin(config.typeExtensions![typeName])
      };
      return map;
    },
    {}
  );
  return {
    ...admin,
    types,
    typeExtensions,
    mutations,
    ...(settings && settings.kind === TypeKind.INPUT_OBJECT ? { settings } : {})
  };
}
