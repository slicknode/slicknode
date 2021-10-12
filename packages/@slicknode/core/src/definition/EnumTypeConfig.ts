/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { EnumValueConfigMap } from './EnumValueConfig';

import { BaseTypeConfig } from './BaseTypeConfig';
import { TypeKind } from './TypeKind';

export type EnumTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.ENUM;
  /**
   * The available values of the Enum type
   */
  values: EnumValueConfigMap;
};
