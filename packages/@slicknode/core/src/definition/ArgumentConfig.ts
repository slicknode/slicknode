/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

export type ArgumentConfig = {
  /**
   * The GraphQL type name of the input value
   */
  typeName: string;
  /**
   * True if the value cannot be NULL
   */
  required?: boolean;
  /**
   * True if the value is a list value. If required is true as will, inner type will be also Non-Null
   *
   * An array value defines the number of dimensions. For each value a dimension is added with the boolean
   * indicating if the value is Non-Null, starting from the inside.
   *
   * For example [false, true] would result in a type like [[String]!]
   */
  list?: boolean | Array<boolean>;
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
};

export type ArgumentConfigMap = {
  [key: string]: ArgumentConfig;
};
