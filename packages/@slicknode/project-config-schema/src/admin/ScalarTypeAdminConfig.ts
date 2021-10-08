/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { BaseTypeAdminConfig } from './BaseTypeAdminConfig';
import { TypeKind } from '../TypeKind';

export type ScalarTypeAdminConfig = BaseTypeAdminConfig & {
  /**
   * Type kind
   */
  kind: TypeKind.SCALAR; // Same as TYPE_KIND_SCALAR
};
