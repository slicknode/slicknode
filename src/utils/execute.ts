/**
 * Created by Ivo Meißner on 18.04.18
 *
 * @flow
 */
import {spawn, SpawnOptions} from 'child_process';

type ApiResult = string;

/**
 * Runs a command passing the args and if provided pipes the stdin to the process
 *
 * @param command
 * @param args
 * @param stdin
 * @param options Options for child_prodcess.spawn
 * @returns {Promise.<*>}
 * @private
 */
export default function execute(
  command: string,
  args: ReadonlyArray<string> = [],
  stdin: string | null = null,
  options: SpawnOptions = {},
): Promise<ApiResult> {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, args, {
      windowsHide: true,
      ...options,
    });
    let result = '';
    let err = '';
    if (cmd.stdout) {
      cmd.stdout.on('data', (output) => {
        result += output + '\n';
      });
    }
    if (cmd.stderr) {
      cmd.stderr.on('data', (output) => {
        err += output;
      });
    }

    // If we have stdin write to kubectl
    if (stdin && cmd.stdin) {
      cmd.stdin.write(stdin);
      cmd.stdin.end();
    }

    cmd.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(err || result));
      } else {
        resolve(result);
      }
    });
  });
}
