import fetch from 'node-fetch';
import { waitFor } from './waitFor';

/**
 * Wait for the API endpoint to become available
 * @param endpoint GraphQL API endpoint
 */
export async function waitForEndpoint(endpoint: string) {
  await waitFor({
    async handler() {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ query: '{__typename}' }),
      });
      return res.status === 200;
    },
    interval: 1500,
    timeout: 60000,
  });
}
