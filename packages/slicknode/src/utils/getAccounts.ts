import Client from '@slicknode/client-node';
import { BaseCommand } from '../base/base-command';

export type AccountInfo = {
  name: string;
  identifier: string;
  id: string;
};

export const GET_ACCOUNTS_QUERY = `query GetAccounts {
  viewer {
    user {
      accounts(first: 250) {
        edges {
          node {
            account {
              id
              identifier
              name
            }
          }
        }
      }
    }
  }
}`;

/**
 * Returns a list of all accounts for the current user
 * @param client
 * @returns
 */
export async function getAccounts({
  client,
  command,
}: {
  client: Client;
  command: BaseCommand;
}): Promise<Array<AccountInfo>> {
  const result = await client.fetch(GET_ACCOUNTS_QUERY);
  if (result.errors?.[0]) {
    command.error(`Error loading accounts: ${result.errors[0].message}`);
  }

  return (result?.data?.viewer?.user?.accounts?.edges || []).map(
    ({ node }: any) => node.account
  );
}
