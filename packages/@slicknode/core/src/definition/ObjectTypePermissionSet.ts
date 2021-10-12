/**
 * Created by Ivo Meißner on 21.09.18
 *
 */
import { Permission } from '../auth/type';
import { TypeMutationPermission } from './TypeMutationPermission';

export interface ObjectTypePermissionSet {
  permissions?: Array<Permission>;
  mutations?: TypeMutationPermission;
}
