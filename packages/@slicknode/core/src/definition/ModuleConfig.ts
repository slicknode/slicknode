/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */
import { ModuleKind } from './ModuleKind';
import { TypeConfig } from './TypeConfig';
import { ConnectionConfig } from './ConnectionConfig';
import { MutationConfig } from './MutationConfig';
import { RFDefinition } from './RFDefinition';
import { TypeExtensionConfigMap } from './FieldConfig';
import { ModuleAdminConfig } from './admin';
import { FunctionConfigMap } from './FunctionConfig';
import { InputObjectTypeConfig } from './InputObjectTypeConfig';
import { ModuleRuntime } from './ModuleRuntime';
import { ResolverConfigMap } from './ResolverConfig';
import { ObjectTypePermissionSet } from './ObjectTypePermissionSet';
import { RemoteModule } from './RemoteModule';
import { DirectiveConfig } from './DirectiveConfig';
import { ModuleConfigEnhancer } from './ModuleConfigEnhancer';
import { DataFixture } from './DataFixture';

export type ModuleConfig = {
  /**
   * An ID if the appConfig is stored in a database (UUID).
   * If the app is of kind native, it uses the identifier for the module to be loaded
   */
  id: string;
  /**
   * Semver version number of app configuration
   */
  version: string;
  /**
   * What kind of app is it
   */
  kind: ModuleKind;
  /**
   * The namespace of the app and its types. This must be unique within the whole
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
   * A list of listener function definitions
   */
  listeners?: Array<RFDefinition>;
  /**
   * A list of directives
   */
  directives?: Array<DirectiveConfig>;
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
   * A two dimensional map of custom resolver configurations for types and their fields
   * For example:
   *
   * {
   *  Query: {
   *    fieldName: {
   *      // Resolver configuration here:
   *      handler: "handlername"
   *      //...
   *    }
   *  }
   * }
   */
  resolvers?: ResolverConfigMap;
  /**
   * Permissions that are granted for types in the project. These could also be
   * in other modules. Permissions are then merged with the existing type permissions.
   */
  typePermissions?: {
    [typeName: string]: ObjectTypePermissionSet;
  };
  /**
   * The admin configurations of the app
   * The base admin config serves as a fallback in case some values
   * are not configured in one of the locales or if a locale is not defined
   */
  admin: {
    base: ModuleAdminConfig;
    [locale: string]: ModuleAdminConfig;
  };
  /**
   * Function handlers for external functionality and logic extensions
   * that are referenced in hooks etc.
   */
  functions?: FunctionConfigMap;
  /**
   * The input object that defines the structure of the runtime settings
   * that are available in the module, for example to store 3rd party API keys etc.
   */
  settings?: InputObjectTypeConfig;
  /**
   * Module runtime configuration for user code executions
   */
  runtime?: ModuleRuntime;
  /**
   * The raw GraphQL schema as a string. This can be served to preserve / restore client
   * formatting and comments of custom code. Usually content of the schema.graphql file
   * If no rawSchema is available, the content will be generated from config
   */
  rawSchema?: string;
  /**
   * The raw slicknode.yml config file content as a string. To preserve / restore client
   * formatting and comments.
   * If no rawConfig is available, the content will be generated from config
   */
  rawConfig?: string;
  /**
   * Enhances the module config and returns a new ModuleConfig object
   * Can be used to generate (union) types that depend on the other module configs
   *
   * @param module
   * @param originalModules
   */
  enhanceModule?: ModuleConfigEnhancer;
  /**
   * Remote module configuration for external GraphQL server configuration
   */
  remoteModule?: RemoteModule;

  /**
   * An array of data fixtures to install
   *
   * Only meant for internal system data (like initial Locale). Other data should
   * be imported via import / export functionality
   */
  fixtures?: DataFixture[];
};
