/**
 * Created by Ivo Meißner on 17.12.18
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { ModuleConfig } from '../../../definition';

import { PackageError } from '../../../errors';

/**
 * Checks if the type name matches the naming conventions
 *
 * @param context
 * @constructor
 */
function NoModuleRuntime(context: ValidationContext): ValidationRuleConfig {
  const foundModules = [];

  return {
    app: (appConfig: ModuleConfig) => {
      if (appConfig.runtime) {
        foundModules.push(appConfig.id);
      }
    },

    leave() {
      if (foundModules.length) {
        context.reportError(
          new PackageError(
            `No runtime endpoint is configured for the project. Set the runtime endpoint for the project or remove the runtime from the module "${foundModules.join(
              '", "'
            )}".`
          )
        );
      }
    },
  };
}

export default NoModuleRuntime;
