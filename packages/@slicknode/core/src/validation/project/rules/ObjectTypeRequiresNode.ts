/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  TypeConfig,
  ModuleConfig,
  isObjectTypeConfig,
} from '../../../definition';

import { ModuleKind, TypeKind } from '../../../definition';

import { PackageError } from '../../../errors';

/**
 * Ensures that ObjectTypes implement Node interface
 * This could eventually be removed once all object types are supported
 *
 * @param context
 * @constructor
 */
function ObjectTypeRequiresNode(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModule;
  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      // Check if ObjectType implements node
      if (
        currentModule.kind !== ModuleKind.NATIVE &&
        isObjectTypeConfig(config) &&
        !(config.interfaces || []).includes('Node')
      ) {
        context.reportError(
          new PackageError(
            `Type "${config.name}" has to implement "Node" interface`,
            currentModule.id,
            ['types', config.name]
          )
        );
      }
    },
  };
}

export default ObjectTypeRequiresNode;
