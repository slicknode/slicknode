/**
 * Created by Ivo Meißner on 14.06.17.
 *
 */

import { FieldAdminConfigMap } from './FieldAdminConfig';

export type MutationAdminConfig = {
  /**
   * Default plural name of the object
   */
  label: string;
  /**
   * The description of the mutation
   */
  description: string;
  /**
   * Configurations for the fields of the object
   */
  fields: FieldAdminConfigMap;
  /**
   * The input fields of the mutation
   */
  inputFields: FieldAdminConfigMap;
};

export type MutationAdminConfigMap = {
  [name: string]: MutationAdminConfig;
};
