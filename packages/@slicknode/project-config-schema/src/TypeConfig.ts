/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { ObjectTypeConfig } from './ObjectTypeConfig';
import { EnumTypeConfig } from './EnumTypeConfig';
import { ScalarTypeConfig } from './ScalarTypeConfig';
import { InterfaceTypeConfig } from './InterfaceTypeConfig';
import { InputObjectTypeConfig } from './InputObjectTypeConfig';
import { UnionTypeConfig } from './UnionTypeConfig';

export type TypeConfig =
  | ObjectTypeConfig
  | InputObjectTypeConfig
  | ScalarTypeConfig
  | InterfaceTypeConfig
  | UnionTypeConfig
  | EnumTypeConfig;

export type TypeConfigMap = {
  [key: string]: TypeConfig;
};
