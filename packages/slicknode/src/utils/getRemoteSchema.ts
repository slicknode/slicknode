import {
  buildClientSchema,
  getIntrospectionQuery,
  GraphQLSchema,
} from 'graphql';
import fetch from 'node-fetch';

/**
 * Loads a remote GraphQL schema via introspection
 * @param params
 */
export async function getRemoteSchema(params: {
  endpoint: string;
  headers?: { [name: string]: string };
}): Promise<GraphQLSchema> {
  const { endpoint } = params;

  const query = getIntrospectionQuery({
    descriptions: true,
  });
  const headers: { [name: string]: string } = {
    ...(params.headers || {}),
    'Content-Type': 'application/json',
  };
  try {
    const response = await fetch(endpoint, {
      headers,
      method: 'POST',
      body: JSON.stringify({
        query,
      }),
    });
    if (response.status !== 200) {
      throw new Error(
        `Response code ${response.status}, ${response.statusText}`
      );
    }
    const data = await response.json();
    return buildClientSchema(data.data);
  } catch (e: any) {
    throw new Error(`Error loading remote GraphQL schema: ${e.message}`);
  }
}
