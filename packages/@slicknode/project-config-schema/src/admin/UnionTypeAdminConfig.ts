/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { BaseTypeAdminConfig } from './BaseTypeAdminConfig';
import { TypeKind } from '../TypeKind';

export type UnionTypeAdminConfig = BaseTypeAdminConfig & {
  /**
   * Same as TYPE_KIND_UNION
   */
  kind: TypeKind.UNION;
  /**
   * Default plural name of the object
   */
  labelPlural: string;
  /**
   * An array of all type names of the union type
   */
  typeNames: Array<string>;
};
