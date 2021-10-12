import { ConfigStorage } from '../api';
import * as os from 'os';
import * as path from 'path';
import { DEFAULT_API_ENDPOINT } from '../config';
import { Client } from '@slicknode/client-node';

export async function getClient(params: {
  userAgent: string;
  configStorage: ConfigStorage;
}) {
  const { userAgent, configStorage } = params;
  const authStorage = new ConfigStorage(
    path.join(os.homedir(), '.slicknode', 'auth.json')
  );

  // Build config
  const config = {
    // Default values
    endpoint: DEFAULT_API_ENDPOINT,

    // Overwrite locally configured default values
    ...configStorage.getValues(),
  };

  return new Client({
    endpoint: config.endpoint,
    storage: authStorage,
    headers: {
      'User-Agent': userAgent,
    },
  });
}
