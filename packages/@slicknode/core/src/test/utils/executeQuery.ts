/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */

import Context from '../../context';

import { graphql } from 'graphql';
import { AuthContext } from '../../auth';

type Options = {
  authContext?: AuthContext;
};

/**
 * Returns a promise that resolves the given query
 * @param query
 * @param context
 * @param variableValues
 * @param options
 * @returns {Promise}
 */
export function executeQuery(
  query: string,
  context: Context,
  variableValues: {
    [x: string]: any;
  } = {},
  options: Options = {}
): Promise<{
  [x: string]: any;
}> {
  return new Promise((resolve, reject) => {
    // Store current auth context
    const currentAuth = context.auth;
    if (options.authContext) {
      context.auth = options.authContext;
    }

    graphql(
      context.schemaBuilder.getSchema(),
      query,
      null,
      context,
      variableValues
    )
      .then((result) => {
        if (options.authContext) {
          context.auth = currentAuth;
        }
        if (result.errors && result.errors.length) {
          reject(result.errors[0]);
        } else {
          resolve(result.data);
        }
      })
      .catch((error) => {
        if (options.authContext) {
          context.auth = currentAuth;
        }
        reject(error);
      });
  }) as Promise<{
    [x: string]: any;
  }>;
}

export default executeQuery;
