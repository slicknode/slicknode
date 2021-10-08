import { queryComplexityValidator, formatError } from '@slicknode/core';

import { graphqlHTTP } from 'express-graphql';
import { RequestHandler } from 'express';

export const GraphQLAPI = (): RequestHandler => {
  /**
   * Project GraphQL API
   *
   * @param req
   * @param res
   */
  return (req, res) => {
    if (!req.context) {
      throw new Error('Context not found on request object');
    }
    // Create GraphQL middleware
    const middleware = graphqlHTTP(async (request, response, graphQLParams) => {
      const context = req.context!;
      return {
        schema: context.schemaBuilder.getSchema(),
        graphiql: true,
        validationRules: [
          queryComplexityValidator(
            (graphQLParams && graphQLParams.variables) || {}
          ),
        ],
        context,
        customFormatErrorFn: formatError,
      };
    });
    middleware(req, res);
  };
};
