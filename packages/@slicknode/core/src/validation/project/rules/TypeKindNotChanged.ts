/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { TypeConfig, ModuleConfig } from '../../../definition';

import { PackageError } from '../../../errors';

/**
 * Ensures that type kind is not changed
 *
 * @param context
 * @constructor
 */
function TypeKindNotChanged(context: ValidationContext): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (
      config: TypeConfig,
      previousConfig: TypeConfig | undefined | null
    ) => {
      // Check if ObjectType implements node
      if (previousConfig && previousConfig.kind !== config.kind) {
        context.reportError(
          new PackageError(
            `Cannot change the kind of type "${config.name}". Delete the type, run migration and add the new type instead.`,
            currentModule.id,
            ['types', config.name]
          )
        );
      }
    },
  };
}

export default TypeKindNotChanged;
