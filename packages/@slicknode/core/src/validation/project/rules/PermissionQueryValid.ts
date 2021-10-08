/**
 * Created by Ivo Meißner on 11.01.18.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  ModuleConfig,
  ObjectTypeConfig,
  TypeConfig,
} from '../../../definition';

import { TypeKind } from '../../../definition';

import { PackageError } from '../../../errors';
import SchemaBuilder from '../../../schema/builder';
import _ from 'lodash';
import { createPermissionQuerySchema } from '../../../auth';
import { parse, validate } from 'graphql';

/**
 * Validates the permission queries in all types
 *
 * @param context
 * @constructor
 */
function PermissionQueryValid(
  context: ValidationContext
): ValidationRuleConfig {
  const modules = [];
  return {
    app: (appConfig: ModuleConfig) => {
      modules.push(appConfig);
    },

    leave: () => {
      // Build schema
      try {
        const builder = new SchemaBuilder({ modules });
        const schema = builder.getSchema();

        Object.keys(builder.typeConfigs)
          .map((name) => builder.typeConfigs[name] as TypeConfig)
          // We only need to check on object types
          .filter((config) => config.kind === TypeKind.OBJECT)
          .forEach((config: ObjectTypeConfig) => {
            // Collect all permissions that have permission query
            const allPermissions = [
              ..._.get(config, 'permissions', []),
              ..._.get(config, 'mutations.create', []),
              ..._.get(config, 'mutations.update', []),
              ..._.get(config, 'mutations.delete', []),
            ].filter((perm) => perm.query);

            if (allPermissions.length) {
              const permissionSchema = createPermissionQuerySchema(
                schema,
                config
              );

              allPermissions.forEach((perm) => {
                if (perm.query) {
                  try {
                    const document = parse(perm.query, { noLocation: true });
                    const errors = validate(permissionSchema, document);
                    if (errors.length) {
                      context.reportError(
                        new PackageError(
                          `Invalid permission query for type ${
                            config.name
                          }: ${errors.map((err) => err.message).join(', ')}`
                        )
                      );
                    }
                  } catch (e) {
                    context.reportError(
                      new PackageError(
                        `Invalid permission query for type ${config.name}: ${e.message}`
                      )
                    );
                  }
                }
              });
            }
          });
      } catch (e) {
        if (context.getErrors().length === 0) {
          context.reportError(
            new PackageError(
              'Could not validate permission queries, schema building failed.' +
                e.message
            )
          );
        }
      }
    },
  };
}

export default PermissionQueryValid;
