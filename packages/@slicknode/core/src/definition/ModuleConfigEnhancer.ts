/**
 * Enhances the module config and returns a new ModuleConfig object
 * Can be used to generate (union) types that depend on the other module configs
 *
 * @param module
 * @param originalModules
 */
import { ModuleConfig } from './ModuleConfig';

export type ModuleConfigEnhancer = (
  module: ModuleConfig,
  originalModules: Array<ModuleConfig>
) => ModuleConfig;
