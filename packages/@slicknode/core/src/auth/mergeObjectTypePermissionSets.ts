/**
 * Created by Ivo Meißner on 21.09.18
 *
 */
import { ObjectTypePermissionSet } from '../definition';
import _ from 'lodash';

/**
 * Merges the permissions into the target permission set. Returns a new object with the
 * merged permissions
 *
 * @param target
 * @param permissions
 */
export default function mergeObjectTypePermissionSets<
  T extends ObjectTypePermissionSet
>(target: T, permissions: ObjectTypePermissionSet): T {
  return [
    'permissions',
    'mutations.create',
    'mutations.delete',
    'mutations.update',
    'mutations.publish',
    'mutations.unpublish',
  ].reduce(
    (mergedPermissionSet, key) =>
      mergeByKey(mergedPermissionSet, permissions, key),
    target
  );
}

function mergeByKey<T extends ObjectTypePermissionSet>(
  target: T,
  permissions: ObjectTypePermissionSet,
  key: string
): T {
  const newPermissions = _.get(permissions, key, []);

  // Create new object, leaving
  if (newPermissions.length) {
    const targetPermissions = _.get(target, key, []);
    const mergedPermissions = [...targetPermissions, ...newPermissions];
    return _.setWith(_.clone(target), key, mergedPermissions, _.clone);
  }

  // No permissions for key, return original object
  return target;
}
