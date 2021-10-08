/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { ModuleConfig } from './ModuleConfig';
import { ModuleSettingsMap } from './ModuleSettings';

export type ProjectConfig = {
  /**
   * Module configuration
   */
  modules: Array<ModuleConfig>;
  /**
   * Runtime settings for the project
   */
  moduleSettings: ModuleSettingsMap;
};
