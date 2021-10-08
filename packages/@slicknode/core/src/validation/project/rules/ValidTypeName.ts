/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { TypeConfig, ModuleConfig } from '../../../definition';

import { ModuleKind } from '../../../definition';

import { PackageError } from '../../../errors';

const MAX_LENGTH = 40;
const MIN_LENGTH = 4;

/**
 * Checks if the type name matches the naming conventions
 *
 * @param context
 * @constructor
 */
function ValidTypeName(context: ValidationContext): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      // Check if starts with namespace
      const name = config.name;
      if (
        currentModule.namespace &&
        !name.startsWith(`${currentModule.namespace}_`)
      ) {
        context.reportError(
          new PackageError(
            `Invalid type name: The type "${name}" has to start with the namespace "${currentModule.namespace}_"`,
            currentModule.id
          )
        );
        return;
      }

      if (currentModule.kind !== ModuleKind.NATIVE) {
        if (!name.match('^([A-Z]+)([a-zA-Z0-9]*)_([A-Z]+)([a-zA-Z0-9]*)$')) {
          context.reportError(
            new PackageError(
              'Invalid type name: The type "' +
                name +
                '" has an invalid format. ' +
                'It has to start with an uppercase letter and can only contain alpha numeric characters',
              currentModule.id,
              ['types', name]
            )
          );
          return;
        }

        if (name.length > MAX_LENGTH) {
          context.reportError(
            new PackageError(
              'Invalid type name: The name "' +
                name +
                '" exceeds the maximum length of ' +
                MAX_LENGTH +
                ' characters',
              currentModule.id,
              ['types', name]
            )
          );
          return;
        }

        if (name.length < MIN_LENGTH) {
          context.reportError(
            new PackageError(
              `Invalid type name: The name "${name}" has to be at least ${MIN_LENGTH} characters long'`,
              currentModule.id,
              ['types', name]
            )
          );
          return;
        }
      }
    },
  };
}

export default ValidTypeName;
