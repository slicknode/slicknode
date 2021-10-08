/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { BaseTypeAdminConfig } from './BaseTypeAdminConfig';
import { EnumValueAdminConfig } from './EnumValueAdminConfig';
import { TypeKind } from '../TypeKind';

export type EnumTypeAdminConfig = BaseTypeAdminConfig & {
  /**
   * Type kind
   */
  kind: TypeKind.ENUM; // Same as TYPE_KIND_ENUM,
  /**
   * Configurations for the fields of the object
   */
  values: Array<EnumValueAdminConfig>;
};
