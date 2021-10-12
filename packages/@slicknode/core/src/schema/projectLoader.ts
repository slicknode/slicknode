/**
 * Created by Ivo Meißner on 09.02.17.
 *
 */

import {
  ModuleConfig,
  TypeConfig,
  ProjectConfig,
  isNode,
  ModuleSettingsMap,
} from '../definition';
import Node from '../modules/relay/types/Node';
import { TypeKind, ModuleKind } from '../definition';
import { tenantModules } from '../modules/tenantModules';
import _ from 'lodash';
import { encrypt, decrypt } from '../utils/crypt';
import deepFreeze from 'deep-freeze';
import { upgradeModuleConfigs } from '../migration/upgradeConfig';

/**
 * Converts the project config to a storable JSON string with encrypted variables
 * @param projectConfig
 * @param secretKey Key to be used to encrypt module settings
 */
export function fromProjectConfigToJSON(
  projectConfig: ProjectConfig,
  secretKey: string
): string {
  // Turn modules into persistable entites
  const persistableModules = projectConfig.modules.map(
    (module: ModuleConfig) => {
      if (module.kind === ModuleKind.DYNAMIC) {
        return module;
      }

      return _.pick(module, ['id', 'kind', 'version']);
    }
  );

  // Encrypt values and convert to JSON string
  return JSON.stringify({
    modules: persistableModules,
    moduleSettings: encrypt(projectConfig.moduleSettings, secretKey),
  });
}

/**
 * Converts the previously stored JSON string to a project config
 * @param val The project config either as string or as the object
 * @param secretKey Key to be used to decrypt module settings
 */
export async function fromJSONToProjectConfig(
  val: string | object,
  secretKey: string
): Promise<ProjectConfig> {
  const decodedConfig = typeof val === 'string' ? JSON.parse(val) : val;
  const modules = _.get(decodedConfig, 'modules', []).map(
    (appConfig: ModuleConfig) => {
      if (appConfig.kind === ModuleKind.NATIVE) {
        // Load module
        for (let i = 0; i < tenantModules.length; i++) {
          if (tenantModules[i].id === appConfig.id) {
            // Check if versions match
            if (tenantModules[i].version !== appConfig.version) {
              // @TODO: Load older versions from somewhere...
              throw new Error(
                `Version of app not valid for app with ID: ${appConfig.id}`
              );
            }

            return tenantModules[i];
          }
        }

        throw new Error(`Native app not registered for ID: ${appConfig.id}`);
      } else if (appConfig.kind === ModuleKind.DYNAMIC) {
        const types = (appConfig.types || []).map((item: TypeConfig) => {
          if (isNode(item)) {
            // Add Node resolver to get global IDs
            return {
              ...item,
              fields: {
                ...item.fields,
                id: Node.fields.id,
              },
            };
          }
          return item;
        });

        // Upgrade legacy configs to current module format
        const app = upgradeModuleConfigs([
          {
            ...appConfig,
            types,
          },
        ])[0];
        // Deep freeze during development to prevent accidental mutation
        return process.env.NODE_ENV !== 'production' ? deepFreeze(app) : app;
      }

      return appConfig;
    }
  );

  return {
    modules,
    moduleSettings: decrypt(
      decodedConfig.moduleSettings,
      secretKey
    ) as ModuleSettingsMap,
  };
}
