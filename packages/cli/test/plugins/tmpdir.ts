import * as path from 'path';
import { mkdirpSync } from 'fs-extra';
import os from 'os';
import * as uuid from 'uuid';
import rimraf = require('rimraf');

export function tmpdir() {
  return {
    async run(ctx: { tmpdir?: string }) {
      // Copy all files from source to temp folder
      const tmpdir = (ctx.tmpdir = path.join(os.tmpdir(), uuid.v1()));
      mkdirpSync(tmpdir);
    },

    // Delete temporary workspace
    async finally(ctx: { tmpdir?: string }) {
      if (ctx.tmpdir) {
        return await new Promise((resolve) => {
          rimraf(ctx.tmpdir!, {}, resolve);
        });
      }
    },
  };
}
