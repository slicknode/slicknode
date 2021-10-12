/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { Permission } from './auth/type';
import { FieldConfigMap } from './FieldConfig';

export type MutationConfig = {
  /**
   * The name of the type within its namespace
   * So if the module has the namespace MyModule and the exposed GraphQL type name would be
   * `MyModule_BlogPost`, this property would have the value `BlogPost`
   */
  name: string;
  /**
   * The description of the type that is also exposed via GraphQL
   */
  description?: string;
  /**
   * The reason for the deprecation, will be also applied to GraphQL field
   */
  deprecationReason?: string;
  /**
   * An array of input arguments for the field
   */
  fields: FieldConfigMap;
  /**
   * A name of an output type that should be used instead of generating one from fields
   */
  outputTypeName?: string;
  /**
   * The permissions on that specific mutation
   */
  permissions: Array<Permission>;
  /**
   * An array of input field definitions
   */
  inputFields: FieldConfigMap;
  /**
   * A name of an input type that should be used instead of generating one from inputFields
   */
  inputTypeName?: string;
};

export type MutationConfigMap = {
  [key: string]: MutationConfig;
};
