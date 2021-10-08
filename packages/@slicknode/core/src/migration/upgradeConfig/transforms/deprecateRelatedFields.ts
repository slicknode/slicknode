import { ModuleConfigUpgradeTransform } from '../upgradeModuleConfigs';

/**
 * Renames ModuleConfig.relatedFields to ModuleConfig.typeExtensions
 *
 * @param oldModule
 */
export const deprecateRelatedFields: ModuleConfigUpgradeTransform = (
  oldModule
) => {
  const { relatedFields, ...rest } = oldModule;
  if (relatedFields) {
    return {
      ...rest,
      typeExtensions: relatedFields,
    };
  }
  return oldModule;
};
