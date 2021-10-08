/**
 * Created by Ivo Meißner on 12.10.17.
 *
 */

import {
  FieldConfigMap,
  ModuleConfig,
  FieldConfig,
  ObjectTypePermissionSet,
} from '../definition';

import _ from 'lodash';
import mergeObjectTypePermissionSets from '../auth/mergeObjectTypePermissionSets';
import { Permission } from '../auth';
import Context from '../context';
import { GraphQLResolveInfo } from 'graphql';

/**
 * Returns a object of all related fields that
 * are persisted in datastore for each type
 */
export function getPersistedTypeExtensionMap(
  modules: Array<ModuleConfig>
): {
  [typeName: string]: FieldConfigMap;
} {
  // Build current related field map of fields that have no resolvers
  // and should be part of datastore
  return modules.reduce((map, app) => {
    if (app.typeExtensions) {
      Object.keys(app.typeExtensions).forEach((typeName) => {
        const fields = _.pickBy(
          (app.typeExtensions || {})[typeName],
          (value: FieldConfig, fieldName: string) => {
            return (
              // Fields that have native resolver or a field are not persisted
              typeof value.resolve === 'undefined' &&
              typeof value.field === 'undefined' &&
              // Fields with custom resolvers are not persisted to DB
              !(
                app.resolvers &&
                app.resolvers.hasOwnProperty(typeName) &&
                app.resolvers[typeName].hasOwnProperty(fieldName)
              )
            );
          }
        );
        if (Object.keys(fields).length) {
          map[typeName] = {
            ...(map[typeName] || {}),
            ...fields,
          };
        }
      });
    }
    return map;
  }, {});
}

/**
 * Builds the ObjectTypePermissionSet map from all modules
 *
 * @param modules
 */
export function getObjectTypePermissionMap(
  modules: Array<ModuleConfig>
): {
  [typeName: string]: ObjectTypePermissionSet;
} {
  return modules.reduce((map, module) => {
    if (module.typePermissions) {
      Object.keys(module.typePermissions).forEach((typeName) => {
        map[typeName] = mergeObjectTypePermissionSets(
          map[typeName] || {},
          (module.typePermissions || {})[typeName]
        );
      });
    }

    return map;
  }, {});
}

export function getMutationPermissionMap(
  modules: Array<ModuleConfig>
): {
  [mutationName: string]: Array<Permission>;
} {
  return modules.reduce((map, module: ModuleConfig) => {
    if (
      module.typePermissions &&
      module.typePermissions.hasOwnProperty('Mutation')
    ) {
      // Iterate over permission map
      _.get(module, 'typePermissions.Mutation.permissions', []).forEach(
        (permission) => {
          _.get(permission, 'fields', []).forEach((field) => {
            map[field] = [
              ...(map[field] || []),
              _.omit(permission, ['fields']), // We don't need fields from permission as this defines the mutation
            ];
          });
        }
      );
    }
    return map;
  }, {});
}

/**
 * Gets the query context (locale, preview) inside of a resolver
 * Updates the query context for that path if args are provided
 *
 * @param options
 */
export function getContentContext(options: {
  context: Context;
  info: GraphQLResolveInfo;
  args:
    | {
        preview?: boolean;
        locale?: string;
      }
    | undefined;
}) {
  const { context, info, args } = options;

  // Get / set preview setting
  let preview: boolean;
  if (args && args.hasOwnProperty('preview')) {
    preview = Boolean(args.preview);
    context.setPreview(info.path, preview);
  } else {
    preview = context.getPreview(info.path);
  }

  // Get set locale
  let locale: string;
  if (args && args.hasOwnProperty('locale')) {
    locale = args.locale;
    context.setLocale(info.path, locale);
  } else {
    locale = context.getLocale(info.path);
  }

  return {
    preview,
    locale,
  };
}
