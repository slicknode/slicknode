import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { IModuleConfig, IProjectConfig } from '../types';
import {
  PRIVATE_MODULE_NAME_REGEX,
  validateConfig,
  validateModule,
} from '../validation';

export interface IModuleListItem {
  // Absolute path to the module directory
  path: string;

  // Validated module config
  config: IModuleConfig;
}

export async function getModuleList(dir: string): Promise<IModuleListItem[]> {
  try {
    const rawData = fs.readFileSync(path.join(dir, 'slicknode.yml'), 'utf8');
    const config = (yaml.safeLoad(rawData) as IProjectConfig) || null;
    const projectConfigErrors = await validateConfig(config);
    if (projectConfigErrors.length) {
      throw projectConfigErrors[0];
    }

    if (!config) {
      throw new Error('No valid slicknode.yml config');
    }

    // Add module files
    const promises = Object.keys(config.dependencies).map(async (name) => {
      const isPrivate = name.match(PRIVATE_MODULE_NAME_REGEX);
      const moduleRoot = isPrivate
        ? path.resolve(path.join(dir, config.dependencies[name]))
        : path.join(dir, '.slicknode', 'cache', 'modules', name);

      // Load and validate module config
      const data = fs.readFileSync(
        path.join(moduleRoot, 'slicknode.yml'),
        'utf8'
      );
      const moduleConfig = (yaml.safeLoad(data) as IModuleConfig) || null;
      if (!moduleConfig) {
        throw new Error(`No valid slicknode.yml config for module ${name}`);
      }
      // Validate private modules
      // @TODO: Add validation for native and community modules
      if (isPrivate) {
        const configErrors = await validateModule(moduleConfig);
        if (configErrors.length) {
          throw configErrors[0];
        }
      }
      return {
        path: moduleRoot,
        config: moduleConfig,
      };
    });

    return await Promise.all(promises);
  } catch (e) {
    throw new Error(`Error loading module configs: ${e.message}`);
  }
}
