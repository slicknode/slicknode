/**
 * Created by Ivo Meißner on 2019-07-22
 *
 */
import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  isObjectTypeConfig,
  ModuleConfig,
  TypeConfig,
} from '../../../definition';

import { TypeKind } from '../../../definition';

import { PackageError } from '../../../errors';
import _ from 'lodash';

/**
 * Checks if the field name is a reserved identifier
 *
 * @param context
 * @constructor
 */
function TimeStampedInterfaceStrict(
  context: ValidationContext
): ValidationRuleConfig {
  let currentModule;

  return {
    app: (appConfig: ModuleConfig) => {
      currentModule = appConfig;
    },

    type: (config: TypeConfig) => {
      const typeName = config.name;
      if (
        ((isObjectTypeConfig(config) && config.interfaces) || []).includes(
          'TimeStampedInterface'
        ) &&
        _.get(config, 'fields.lastUpdatedAt.required') === true
      ) {
        context.reportError(
          new PackageError(
            `Field "lastUpdatedAt" on type "${typeName}" cannot be non-null with "TimeStampedInterface"`,
            currentModule.id,
            ['types', typeName]
          )
        );
      }
    },
  };
}

export default TimeStampedInterfaceStrict;
