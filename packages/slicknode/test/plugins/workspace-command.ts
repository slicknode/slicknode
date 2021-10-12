import { FancyTypes } from 'fancy-test';
import * as path from 'path';
import { mkdirpSync } from 'fs-extra';
import copyfiles from 'copyfiles';
import os from 'os';
import * as uuid from 'uuid';
import rimraf = require('rimraf');
import * as _ from 'lodash';

export interface IWorkspaceCommandOptions {
  setWorkspaceAsDir?: boolean;
}

export function workspaceCommand(
  sourcePath: string,
  args: string[] | string | ((ctx: any) => string[] | string),
  options: IWorkspaceCommandOptions = {}
) {
  let cwd: string | null = null;
  return {
    async run(ctx: {
      workspace?: string;
      plugins: { [k: string]: FancyTypes.PluginBuilder<any, any> };
    }) {
      // Copy all files from source to temp folder
      const workspace = path.join(os.tmpdir(), uuid.v1());
      ctx.workspace = workspace;
      await new Promise((resolve) => {
        mkdirpSync(workspace);
        copyfiles(
          [
            path.join(sourcePath, '.slicknode', '**', '*'),
            path.join(sourcePath, '**', '*'),
            path.join(sourcePath, '.*'),
            workspace,
          ],
          { up: sourcePath.split(path.sep).length },
          resolve
        );
      });

      if (ctx.plugins && ctx.plugins.command) {
        let resolvedArgs = typeof args === 'function' ? args(ctx) : args;
        let allArgs = _.isArray(resolvedArgs) ? resolvedArgs : [resolvedArgs];

        if (options.setWorkspaceAsDir) {
          allArgs = allArgs.concat(['--dir', workspace]);
        } else {
          cwd = process.cwd();
          process.chdir(workspace);
          ctx.workspace = process.cwd();
        }

        const cmdPlugin = ctx.plugins.command(allArgs) as FancyTypes.Plugin<
          typeof ctx
        >;
        if (cmdPlugin && cmdPlugin.run) {
          await cmdPlugin.run(ctx);
        }
      } else {
        throw new Error('command plugin not registered');
      }
    },

    // Delete temporary workspace
    async finally(ctx: { workspace?: string }) {
      if (ctx.workspace) {
        if (cwd) {
          process.chdir(cwd);
        } else {
          cwd = null;
        }

        return await new Promise((resolve) => {
          rimraf(ctx.workspace!, {}, resolve);
        });
      }
    },
  };
}
