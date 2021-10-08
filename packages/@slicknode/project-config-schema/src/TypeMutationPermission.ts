/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { Permission } from './auth/type';

export type TypeMutationPermission = {
  /**
   * If attribute is set, a create mutation is generated with the
   * provided permissions
   */
  create?: Array<Permission>;
  /**
   * If the attribute is set, an update mutation is generated with the
   * provided permissions
   */
  update?: Array<Permission>;
  /**
   * If the attribute is set, a delete mutation is generated with the
   * provided permissions
   */
  delete?: Array<Permission>;
};
