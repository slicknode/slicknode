/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { FieldAdminConfig } from './FieldAdminConfig';
import { BaseTypeAdminConfig } from './BaseTypeAdminConfig';
import { TypeKind } from '../TypeKind';

export type InputObjectTypeAdminConfig = BaseTypeAdminConfig & {
  /**
   * Same as TYPE_KIND_INPUT_OBJECT
   */
  kind: TypeKind.INPUT_OBJECT;
  /**
   * Default plural name of the object
   */
  labelPlural: string;
  /**
   * Configurations for the fields of the object
   */
  fields: {
    [name: string]: FieldAdminConfig;
  };
};
