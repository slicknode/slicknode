import { isContent, ModuleConfig } from '../../../definition';
import { ModuleConfigUpgradeTransform } from '../upgradeModuleConfigs';

/**
 * Adds publish / unpublish permissions to Content nodes that were created prior
 * to the release of dedicated publish permissions
 *
 * @param oldModule
 * @returns
 */
export const addPublishPermissions: ModuleConfigUpgradeTransform = (
  oldModule: ModuleConfig
) => {
  const { types } = oldModule;
  let updated = false;
  if (types) {
    const newTypes = types.map((type) => {
      // If is Content node + no publish mutations configured, add permissions
      if (isContent(type) && !type.mutations?.publish) {
        updated = true;
        return {
          ...type,
          mutations: {
            ...(type.mutations || {}),
            publish: type.mutations?.create || [],
            unpublish: type.mutations?.delete || [],
          },
        };
      }
      return type;
    });
    if (updated) {
      return {
        ...oldModule,
        types: newTypes,
      };
    }
  }

  return oldModule;
};
