/**
 * Created by Ivo Meißner on 21.04.17.
 *
 */

import { PageConfig } from './PageConfig';
import { MutationAdminConfigMap } from './MutationAdminConfig';
import { InputObjectTypeAdminConfig } from './InputObjectTypeAdminConfig';
import { TypeAdminConfigMap } from './TypeAdminConfig';
import { TypeExtensionAdminConfigMap } from './TypeExtensionAdminConfig';

export type ModuleAdminConfig = {
  /**
   * The name of the module
   */
  name: string;
  /**
   * The description of the module
   */
  description?: string;
  /**
   * An array of all pages that are displayed for the module
   */
  pages: Array<PageConfig>;
  /**
   * A map of the object type admin configs
   */
  types: TypeAdminConfigMap;
  /**
   * A map of the mutation admin configs where the key is the mutation name
   */
  mutations: MutationAdminConfigMap;
  /**
   * Admin config for the module settings input type
   */
  settings?: InputObjectTypeAdminConfig;
  /**
   * Admin config for type extensions
   */
  typeExtensions?: TypeExtensionAdminConfigMap;
};
