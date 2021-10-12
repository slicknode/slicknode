/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { Permission } from '../auth/type';

import { GraphQLField, GraphQLResolveInfo } from 'graphql';

import Context from '../context';

import { FieldConfig, FieldConfigMap } from './FieldConfig';
import { ComplexityEstimator } from 'graphql-query-complexity';

export type MutationConfig = {
  /**
   * The name of the type within its namespace
   * So if the app has the namespace MyModule and the exposed GraphQL type name would be
   * `MyModule_BlogPost`, this property would have the value `BlogPost`
   */
  name: string;
  /**
   * If a GraphQLField is set in the config, this will be used instead
   * of generating one from config variables
   */
  field?: GraphQLField<any, any> | FieldConfig;
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
  /**
   * Executes the mutation and returns the mutation result
   */
  mutate?: (
    input: {
      [x: string]: any;
    },
    context: Context,
    info: GraphQLResolveInfo
  ) => any;

  /**
   * The query complexity of the mutation field or a function to calculate the complexity
   * Will be used in query complexity analysis:
   *
   * https://github.com/slicknode/graphql-query-complexity
   */
  complexity?: number | ComplexityEstimator;
};

export type MutationConfigMap = {
  [key: string]: MutationConfig;
};
