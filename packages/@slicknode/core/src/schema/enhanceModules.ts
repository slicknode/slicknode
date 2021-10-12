/**
 * Created by Ivo Meißner on 2019-08-02
 *
 */

import buildRemoteModule from './buildRemoteModule';
import { ModuleConfig } from '../definition';

/**
 * Enhances the modules with configured module enhancers and adds the types from remote modules etc.
 *
 * @param modules
 */
export function enhanceModules(
  modules: Array<ModuleConfig>
): Array<ModuleConfig> {
  return modules.map((moduleConfig: ModuleConfig) => {
    let enhancedModule = moduleConfig;

    // Add remote module configs
    if (enhancedModule.remoteModule) {
      enhancedModule = buildRemoteModule(enhancedModule, modules);
    }

    if (enhancedModule.enhanceModule) {
      return enhancedModule.enhanceModule(enhancedModule, modules);
    }
    return enhancedModule;
  });
}
