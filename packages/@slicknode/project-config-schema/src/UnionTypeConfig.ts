/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { TypeKind } from './TypeKind';

export type UnionTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.UNION; // Same as TYPE_KIND_UNION,
  /**
   * An array of all type names
   */
  typeNames: Array<string>;
};
