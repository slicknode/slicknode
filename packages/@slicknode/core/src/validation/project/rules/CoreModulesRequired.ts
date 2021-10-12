/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { ModuleConfig } from '../../../definition';

import { ModuleKind } from '../../../definition';

import { PackageError } from '../../../errors';

import _ from 'lodash';
import { REQUIRED_TENANT_MODULES } from '../../../config';

/**
 * Checks if the type name matches the naming conventions
 *
 * @param context
 * @constructor
 */
function CoreModulesRequired(context: ValidationContext): ValidationRuleConfig {
  const foundModules = [];

  return {
    app: (appConfig: ModuleConfig) => {
      if (appConfig.kind === ModuleKind.NATIVE) {
        foundModules.push(appConfig.id);
      }
    },

    leave() {
      const missingModules = _.difference(
        REQUIRED_TENANT_MODULES,
        foundModules
      );
      if (missingModules.length) {
        context.reportError(
          new PackageError(
            `The modules "${missingModules.join(
              '", "'
            )}" are required. Add them to your root slicknode.yml`
          )
        );
      }
    },
  };
}

export default CoreModulesRequired;
