/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */
import { ModuleKind } from './ModuleKind';
import { TypeConfig } from './TypeConfig';
import { ConnectionConfig } from './ConnectionConfig';
import { MutationConfig } from './MutationConfig';
import { TypeExtensionConfigMap } from './FieldConfig';
import { ModuleAdminConfig } from './admin';
import { InputObjectTypeConfig } from './InputObjectTypeConfig';
import { ObjectTypePermissionSet } from './ObjectTypePermissionSet';

export type ModuleConfig = {
  /**
   * An ID if the moduleConfig is stored in a database (UUID).
   * If the module is of kind native, it uses the identifier for the module to be loaded
   */
  id: string;
  /**
   * Semver version number of module configuration
   */
  version: string;
  /**
   * What kind of module is it
   */
  kind: ModuleKind;
  /**
   * The namespace of the module and its types. This must be unique within the whole
   * GraphQL project
   * Only system modules should have no namespace. For systems modules it must be ensured that the
   * types don't have name collisions
   *
   * Format for namespaces is ([A-Z]+)([a-zA-Z0-9]*)((_([A-Z]+)([a-zA-Z0-9]*))*)
   */
  namespace?: string;
  /**
   * An array of all configured types
   */

  types?: Array<TypeConfig>;
  /**
   * An array of connections between types
   */
  connections?: Array<ConnectionConfig>;
  /**
   * An array of all configured mutations
   */
  mutations?: Array<MutationConfig>;
  /**
   * A map of fields that should be injected into other types
   * where the key is the GraphQL type name on which the field should
   * be added. Make sure to use namespaces or proper naming
   * to avoid name collisions
   *
   * The key for the root query fields is `Query`
   */
  typeExtensions?: TypeExtensionConfigMap;
  /**
   * Permissions that are granted for types in the project. These could also be
   * in other modules. Permissions are then merged with the existing type permissions.
   */
  typePermissions?: {
    [typeName: string]: ObjectTypePermissionSet;
  };
  /**
   * The admin configurations of the module
   * The base admin config serves as a fallback in case some values
   * are not configured in one of the locales or if a locale is not defined
   */
  admin: {
    base: ModuleAdminConfig;
    [locale: string]: ModuleAdminConfig;
  };
  /**
   * The input object that defines the structure of the runtime settings
   * that are available in the module, for example to store 3rd party API keys etc.
   */
  settings?: InputObjectTypeConfig;
};
