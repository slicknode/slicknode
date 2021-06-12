/**
 * Created by Ivo Meißner on 01.12.17.
 *
 * @flow
 */

import { spawn } from 'child_process';

/**
 * Opens the URL in the default browser of the operating system
 *
 * @param url
 */
export function openUrl(url: string): void {
  let command;
  switch (process.platform) {
    case 'darwin':
      command = 'open';
      break;
    case 'win32':
      command = 'explorer.exe';
      break;
    case 'linux':
      command = 'xdg-open';
      break;
    default:
      throw new Error(
        `Could not automatically open URL, unsupported platform ${process.platform}. ` +
          `Open the URL ${url} in your browser`
      );
  }

  const child = spawn(command, [url]);
  child.stderr.setEncoding('utf8');
  let errorMessage = '';
  child.stderr.on('data', (data) => {
    errorMessage += data;
  });

  child.stderr.on('end', () => {
    if (errorMessage) {
      throw new Error(errorMessage);
    }
  });
}
