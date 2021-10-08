import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  TypeConfig,
  isObjectTypeConfig,
  ModuleConfig,
} from '../../../definition';

import { PackageError } from '../../../errors';
import { hasDuplicates } from '../../../utils/array';

/**
 * Ensures that the index configurations for a type are valid
 *
 * @param context
 * @constructor
 */
function ObjectTypeIndexValid(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      if (isObjectTypeConfig(config) && config.indexes) {
        config.indexes.forEach((indexConfig) => {
          if (indexConfig.fields.length < 1) {
            context.reportError(
              new PackageError(
                `Index on type "${config.name}" has to have at least 1 field`,
                currentModule.id,
                ['types', config.name]
              )
            );
            return;
          }

          if (hasDuplicates(indexConfig.fields)) {
            context.reportError(
              new PackageError(
                `Index fields on type "${config.name}" can only be added once`,
                currentModule.id,
                ['types', config.name]
              )
            );
            return;
          }

          // Only allow fields that exist
          indexConfig.fields.forEach((fieldName) => {
            if (!config.fields.hasOwnProperty(fieldName)) {
              context.reportError(
                new PackageError(
                  `Field "${fieldName}" in index config on type "${config.name}" does not exist`,
                  currentModule.id,
                  ['types', config.name]
                )
              );
            }
          });
        });
      }
    },
  };
}

export default ObjectTypeIndexValid;
