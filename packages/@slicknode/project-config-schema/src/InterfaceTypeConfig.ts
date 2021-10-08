/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { FieldConfigMap } from './FieldConfig';
import { TypeKind } from './TypeKind';

export type InterfaceTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.INTERFACE; // Same as TYPE_KIND_INTERFACE,
  /**
   * An array of input arguments for the field
   */
  fields: FieldConfigMap;
};
