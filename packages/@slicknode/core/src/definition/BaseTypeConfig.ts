/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { GraphQLNamedType } from 'graphql';

export type BaseTypeConfig = {
  /**
   * The name of the type within its namespace
   * So if the app has the namespace MyModule and the exposed GraphQL type name would be
   * `MyModule_BlogPost`, this property would have the value `BlogPost`
   */
  name: string;
  /**
   * If a GraphQL Type is set in the config, this will be used instead
   * of generating one from config variables
   */
  type?: GraphQLNamedType;
  /**
   * The description of the type that is also exposed via GraphQL
   */
  description?: string;
  /**
   * The reason for the deprecation, will be also applied to GraphQL field
   */
  deprecationReason?: string;
};
