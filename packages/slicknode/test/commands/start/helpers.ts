import * as baseTest from '../../test';
import path from 'path';
import { FancyTypes } from '@oclif/test';
import { workspaceCommand } from '../../plugins/workspace-command';
import { getServer, setServer } from '../../../src/commands/start';
import fetch from 'node-fetch';

export function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

export const test = baseTest.test.register(
  'startCommand',
  (
    projectName: string,
    args: string[] | string | ((ctx: any) => string[] | string)
  ) => {
    const sourcePath = projectPath(projectName);
    let wsPlugin: any;
    return {
      async run(ctx: {
        workspace?: string;
        plugins: { [k: string]: FancyTypes.PluginBuilder<any, any> };
      }) {
        let terminated = false;
        wsPlugin = workspaceCommand(sourcePath, args);
        wsPlugin.run(ctx).then(
          () => (terminated = true),
          (err: Error) => {
            throw err;
          }
        );
        while (!getServer() && !terminated) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      },

      async finally(ctx: { workspace?: string }) {
        const server = getServer();
        if (server) {
          server.close();
        }
        setServer(null);
        await wsPlugin.finally(ctx);
      },
    };
  }
);

export async function executeQuery(params: {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  port?: number;
}): Promise<{
  data?: Record<string, any>;
  errors?: Array<{ message: string }>;
}> {
  const { query, variables, port = 3000, operationName } = params;

  const result = await fetch(`http://localhost:${port}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      query,
      ...(variables ? { variables } : {}),
      ...(operationName ? { operationName } : {}),
    }),
  });
  const data = await result.json();
  return data;
}
