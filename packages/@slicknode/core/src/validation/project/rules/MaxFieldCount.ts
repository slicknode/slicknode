/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  TypeConfig,
  ModuleConfig,
  isTypeConfigWithFields,
} from '../../../definition';

import { PackageError } from '../../../errors';

const MAX_FIELD_COUNT = 100;

/**
 * Checks if the type name matches the naming conventions
 *
 * @param context
 * @constructor
 */
function MaxFieldCount(context: ValidationContext): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      // Check max field count
      if (
        isTypeConfigWithFields(config) &&
        config.fields &&
        Object.keys(config.fields).length > MAX_FIELD_COUNT
      ) {
        context.reportError(
          new PackageError(
            `The type "${config.name}" cannot have more than ${MAX_FIELD_COUNT} fields`,
            currentModule.id
          )
        );
      }
    },
  };
}

export default MaxFieldCount;
