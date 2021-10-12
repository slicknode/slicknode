/**
 * Created by Ivo Meißner on 2019-07-08
 *
 */
import nock, { Interceptor, Scope } from 'nock';
import deepEqual from 'deep-equal';
import { parse, print } from 'graphql';

export type MockGraphQLAPIOptions = {
  endpoint: string;
  query: string;
  operationName?: string;
  variables?: {
    [name: string]: any;
  };
  headers?: {
    [name: string]: string;
  };
};
/*
function hexToString(hex: string) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}
*/

/**
 * Prettifies the query, removes unnecessary whitespace for comparison
 * @param query
 * @returns {*}
 */
function prettifyQuery(query: string): string {
  return print(parse(query));
}

function mockGraphqlApi(options: MockGraphQLAPIOptions): Interceptor;
function mockGraphqlApi(
  options: MockGraphQLAPIOptions,
  response: { [x: string]: any }
): Scope;
function mockGraphqlApi(
  { endpoint, query, operationName, variables, headers }: MockGraphQLAPIOptions,
  response?: { [x: string]: any }
) {
  const interceptor = nock(endpoint, {
    reqheaders: {
      'content-type': 'application/json',
      ...(headers || {}),
    },
  }).post(
    () => {
      return true;
    },
    (body) => {
      // We have multipart request
      /*
      if (typeof body === 'string') {
        const content = hexToString(body.toString());
        if (!content.includes(query)) {
          return false;
        }
        if (variables && !content.includes(JSON.stringify(variables))) {
          return false;
        }
        if (operationName && !content.includes(JSON.stringify(operationName))) {
          return false;
        }
        return true;
      }
      */

      if (prettifyQuery(body.query) !== prettifyQuery(query)) {
        return false;
      }
      if (variables && !deepEqual(variables, body.variables)) {
        return false;
      }
      if (operationName && body.operationName !== operationName) {
        return false;
      }
      return true;
    }
  );
  if (response) {
    return interceptor.reply(200, JSON.stringify(response));
  }
  return interceptor;
}

export default mockGraphqlApi;
