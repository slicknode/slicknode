import { MAX_QUERY_COMPLEXITY } from './config';

import {
  createComplexityRule,
  simpleEstimator,
  fieldExtensionsEstimator,
  ComplexityEstimator,
} from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';

export const estimators: Array<ComplexityEstimator> = [
  fieldExtensionsEstimator(),

  // The default complexity is 0, only nodes are counted
  simpleEstimator({
    defaultComplexity: 0,
  }),
];

export const queryComplexityValidator = (variables: { [name: string]: any }) =>
  createComplexityRule({
    maximumComplexity: MAX_QUERY_COMPLEXITY,
    variables,

    // Optional function to create a custom error
    createError: (max: number, actual: number) => {
      return new GraphQLError(
        `The query complexity of ${actual} exceeds the maximum complexity of ${max}. ` +
          'Increase the max complexity in the project settings or change the query.'
      );
    },

    estimators,
  }) as any; // @TODO: Fix types in graphql-query-complexity
