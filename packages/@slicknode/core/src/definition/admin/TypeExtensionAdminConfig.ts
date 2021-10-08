/**
 * Created by Ivo Meißner on 2019-09-06
 *
 */
import { FieldAdminConfig } from './FieldAdminConfig';

export type TypeExtensionAdminConfig = {
  /**
   * Configurations for the fields of the object
   */
  fields: {
    [name: string]: FieldAdminConfig;
  };
};

export type TypeExtensionAdminConfigMap = {
  [typeName: string]: TypeExtensionAdminConfig;
};
