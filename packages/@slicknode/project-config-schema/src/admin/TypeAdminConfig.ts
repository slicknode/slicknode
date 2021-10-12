/**
 * Created by Ivo Meißner on 22.04.17.
 *
 */

import { ObjectTypeAdminConfig } from './ObjectTypeAdminConfig';
import { EnumTypeAdminConfig } from './EnumTypeAdminConfig';
import { ScalarTypeAdminConfig } from './ScalarTypeAdminConfig';
import { InterfaceTypeAdminConfig } from './InterfaceTypeAdminConfig';
import { InputObjectTypeAdminConfig } from './InputObjectTypeAdminConfig';
import { UnionTypeAdminConfig } from './UnionTypeAdminConfig';

export type TypeAdminConfig =
  | EnumTypeAdminConfig
  | ObjectTypeAdminConfig
  | ScalarTypeAdminConfig
  | UnionTypeAdminConfig
  | InputObjectTypeAdminConfig
  | InterfaceTypeAdminConfig;

export type TypeAdminConfigMap = {
  [name: string]: TypeAdminConfig;
};
