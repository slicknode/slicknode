import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  TypeConfig,
  isObjectTypeConfig,
  ModuleConfig,
} from '../../../definition';

import { PackageError } from '../../../errors';
import { hasDuplicates } from '../../../utils/array';

/**
 * Ensures that that the autocomplete configuration is valid
 *
 * @param context
 * @constructor
 */
function AutocompleteFieldsValid(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      // Check if ObjectType has autoComplete configuration
      if (isObjectTypeConfig(config) && config.autoCompleteFields) {
        if (config.autoCompleteFields.length < 1) {
          context.reportError(
            new PackageError(
              `Autocomplete on type "${config.name}" has to have at least 1 field`,
              currentModule.id,
              ['types', config.name]
            )
          );
          return;
        }

        if (hasDuplicates(config.autoCompleteFields)) {
          context.reportError(
            new PackageError(
              `Autocomplete fields on type "${config.name}" can only be added once`,
              currentModule.id,
              ['types', config.name]
            )
          );
          return;
        }

        // Only allow index on String fields
        config.autoCompleteFields.forEach((fieldName) => {
          if (!config.fields.hasOwnProperty(fieldName)) {
            context.reportError(
              new PackageError(
                `Autocomplete field "${fieldName}" on type "${config.name}" does not exist`,
                currentModule.id,
                ['types', config.name]
              )
            );
          } else {
            const fieldConfig = config.fields[fieldName];
            if (fieldConfig.typeName !== 'String') {
              context.reportError(
                new PackageError(
                  `Invalid autocomplete field "${fieldName}" on type "${config.name}". Field has to be of type "String", found type "${fieldConfig.typeName}".`,
                  currentModule.id,
                  ['types', config.name]
                )
              );
            }
          }
        });
      }
    },
  };
}

export default AutocompleteFieldsValid;
