/**
 * Created by Ivo Meißner on 16.11.16.
 *
 */

export { Role, AuthContext, Permission } from './type';

export { createPermissionQuerySchema } from './createPermissionQuerySchema';
export { default as buildNodePermissionDocument } from './buildNodePermissionDocument';

import { AuthContext, Permission } from './type';

import { MutationConfig } from '../definition';

import _ from 'lodash';

/**
 * Checks if the given AuthContext has permissions to execute mutation
 *
 * @param input
 * @param context
 * @param mutation
 */
export function isMutateAllowed(
  input: {
    [x: string]: any;
  },
  context: AuthContext,
  mutation: MutationConfig
): boolean {
  // Check if is auth context with write access
  if (!context.write) {
    return false;
  }

  // Check permissions
  const allowedFields = [];
  let fullAccess = false;
  const permissions = mutation.permissions;
  _.each(permissions, (permission: Permission) => {
    if (_.includes(context.roles, permission.role)) {
      // Check if we have partial access
      if (permission.fields) {
        allowedFields.push.apply(allowedFields, permission.fields);
      } else {
        // We have full access, so stop checking other permissions
        fullAccess = true;
        return false;
      }
    }
  });
  if (fullAccess) {
    return true;
  }

  // Check if we have input values that are not allowed
  const inputKeys = _.keys(input).filter((fieldName: string) => {
    // Remove values that have the default values, because they might have been added by GraphQL
    if (
      mutation.inputFields[fieldName] &&
      mutation.inputFields[fieldName].hasOwnProperty('defaultValue')
    ) {
      return mutation.inputFields[fieldName].defaultValue !== input[fieldName];
    }
    return true;
  });

  return (
    _.difference(inputKeys, allowedFields).length === 0 && inputKeys.length > 0
  );
}
