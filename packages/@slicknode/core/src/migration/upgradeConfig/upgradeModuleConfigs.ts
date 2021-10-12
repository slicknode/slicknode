import { ModuleConfig } from '../../definition';
import { addPublishPermissions } from './transforms/addPublishPermissions';
import { deprecateRelatedFields } from './transforms/deprecateRelatedFields';

const transforms: ModuleConfigUpgradeTransform[] = [
  deprecateRelatedFields,
  addPublishPermissions,
];

/**
 * Migrates
 * @param oldModules
 */
export function upgradeModuleConfigs(oldModules: any[]): ModuleConfig[] {
  return oldModules.map((oldModule) => {
    return transforms.reduce(
      (module, transform) => transform(module),
      oldModule
    );
  });
}

export type ModuleConfigUpgradeTransform = (oldModule: any) => ModuleConfig;
