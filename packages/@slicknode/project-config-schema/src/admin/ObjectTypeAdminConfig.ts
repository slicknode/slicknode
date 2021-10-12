/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { FieldAdminConfigMap } from './FieldAdminConfig';
import { BaseTypeAdminConfig } from './BaseTypeAdminConfig';
import { TypeKind } from '../TypeKind';

export type ObjectTypeAdminConfig = BaseTypeAdminConfig & {
  /**
   * Same as TYPE_KIND_OBJECT
   */
  kind: TypeKind.OBJECT;
  /**
   * Default plural name of the object
   */
  labelPlural: string;
  /**
   * Configurations for the fields of the object
   */
  fields: FieldAdminConfigMap;
};
