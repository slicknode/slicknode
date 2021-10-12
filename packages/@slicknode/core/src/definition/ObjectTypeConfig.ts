/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { FieldConfigMap } from './FieldConfig';
import { TypeMutationPermission } from './TypeMutationPermission';
import { HandlerConfig } from './HandlerConfig';

import { Permission } from '../auth/type';
import { TypeKind } from './TypeKind';
import { IndexConfig } from './IndexConfig';

export type ObjectTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.OBJECT; // Same as TypeKind.OBJECT,
  /**
   * The handler for automatically generating functionality, for example
   * to resolve data from RDBMS, rest etc.
   * If none is given, the dynamic functionality generation is skipped and
   * resolve function has to be provided explicitly
   */
  handler?: HandlerConfig;
  /**
   * The datastore table name where the nodes are stored
   * If it is not defined, the tableName is derived from the type name
   */
  tableName?: string;
  /**
   * An array of input arguments for the field
   */
  fields: FieldConfigMap;
  /**
   * The permissions on that specific type
   */
  permissions?: Array<Permission>;
  /**
   * An array of interface type names
   */
  interfaces?: Array<string>;
  /**
   * The mutations that are automatically generated for this type
   */
  mutations?: TypeMutationPermission;
  /**
   * If false, the type is not added to the GraphQL schema. This can be used for
   * types that are only stored in the database
   *
   * The default value is true
   */
  expose?: boolean;
  /**
   * If false, the objects cannot be retrieved via the Query.node field
   * and no Query.getTypeNameByField fields will be added to the query type.
   * The objects can only be retrieved through other nodes.
   *
   * If none is provided, direct access is allowed
   */
  directAccess?: boolean;
  /**
   * A list of fields that should be included for filtering when using autocomplete
   * functionality. If autoCompleteFields are not provided, autoComplete functionality
   * is not available for this type
   */
  autoCompleteFields?: Array<string>;

  /**
   * Database indexes on the table of the type
   */
  indexes?: IndexConfig[];
};
