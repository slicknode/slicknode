/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { FieldConfigMap } from './FieldConfig';
import { TypeKind } from './TypeKind';

export type InputObjectTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.INPUT_OBJECT;
  /**
   * An array of input arguments for the field
   */
  fields: FieldConfigMap;
};
