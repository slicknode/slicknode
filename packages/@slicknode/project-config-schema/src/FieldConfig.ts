/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */
import { ArgumentConfigMap } from './ArgumentConfig';

import { ValidatorConfig, SanitizerConfig } from './validation/type';

import { InputElementType } from './InputElementType';

import { FieldAccess } from './FieldAccess';
import { FieldStorageType } from './FieldStorageType';

export interface FieldConfig {
  /**
   * The GraphQL type name of the returned value
   */
  typeName: string;

  /**
   * True if the value cannot be NULL
   */
  required?: boolean;

  /**
   * True if the value is a list value. If required is true as well, inner type will be also Non-Null
   *
   * An array value defines the number of dimensions. For each value a dimension is added with the boolean
   * indicating if the value is Non-Null, starting from the inside.
   *
   * For example [false, true] would result in a type like [[String]!]
   */
  list?: boolean[];

  /**
   * The description of the field
   */
  description?: string;

  /**
   * The reason for the deprecation, will be also applied to GraphQL field
   */
  deprecationReason?: string;

  /**
   * A default value that is saved if no data is provided
   */
  defaultValue?: any;

  /**
   * True if the datastore has an index on the field
   * Default value is false
   */
  index?: boolean;

  /**
   * The internal storage type if other than the default of the storage handler.
   * Can be used for example to specifiy a type for an ID field (uuid, bigint etc.)
   */
  storageType?: FieldStorageType;

  /**
   * True if the value is unique
   * Default value is false
   */
  unique?: boolean;

  /**
   * An array of input arguments for the field
   */
  arguments?: ArgumentConfigMap;

  /**
   * Configured validators that are run before a mutation is executed
   */
  validators?: ValidatorConfig[];

  /**
   * Configured sanitizers that are applied to all input values
   */
  sanitizers?: SanitizerConfig[];

  /**
   * The default input element type for the admin UI
   */
  inputElementType?: InputElementType;

  /**
   * Limits the access to the field for certain operations. The field will only be
   * included in the provided methods
   *
   * Default / Not defined: Include in all operations
   */
  access?: FieldAccess[];
}

export interface FieldConfigMap {
  [key: string]: FieldConfig;
}

export interface TypeExtensionConfigMap {
  [typeName: string]: FieldConfigMap;
}
