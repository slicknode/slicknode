/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

export type BaseTypeConfig = {
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
};
