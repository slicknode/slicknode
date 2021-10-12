/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { TypeKind } from './TypeKind';

export type ScalarTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.SCALAR; // Same as TYPE_KIND_SCALAR,
};
