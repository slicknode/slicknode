import {FancyTypes} from 'fancy-test';
import path from "path";
import {mkdirpSync} from 'fs-extra';
import copyfiles from 'copyfiles';
import os from "os";
import uuid from 'uuid';
import rimraf = require('rimraf');
import _ from 'lodash';

export function workspaceCommand(sourcePath: string, args: string[] | string | ((ctx: any) => string[] | string)) {
  return {
    async run(ctx: {workspace?: string, plugins: {[k: string]: FancyTypes.PluginBuilder<any, any>}}) {
      // Copy all files from source to temp folder
      const workspace = path.join(os.tmpdir(), uuid.v1());
      ctx.workspace = workspace;
      await new Promise((resolve) => {
        mkdirpSync(workspace);
        copyfiles([
          path.join(sourcePath, '.slicknode', '**', '*'),
          path.join(sourcePath, '**', '*'),
          path.join(sourcePath, '.*'),
          workspace,
        ], {up: sourcePath.split('/').length}, resolve);
      });

      if (ctx.plugins && ctx.plugins.command) {
        let resolvedArgs = typeof args === 'function' ? args(ctx) : args;
        const allArgs = (_.isArray(resolvedArgs) ? resolvedArgs : [resolvedArgs]).concat(['--dir', workspace]);
        const cmdPlugin = (ctx.plugins.command(allArgs) as FancyTypes.Plugin<typeof ctx>);
        if (cmdPlugin && cmdPlugin.run) {
          await cmdPlugin.run(ctx);
        }
      } else {
        throw new Error('command plugin not registered');
      }
    },

    // Delete temporary workspace
    async finally(ctx: {workspace?: string}) {
      if (ctx.workspace) {
        return await new Promise((resolve) => {
          rimraf(ctx.workspace!, {}, resolve);
        });
      }
    }
  }
}
