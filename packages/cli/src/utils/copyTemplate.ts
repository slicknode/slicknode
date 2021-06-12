import originalGlob from 'glob';
import { promisify } from 'util';
const glob = promisify(originalGlob);
import fs from 'fs';
import { mkdirp, readFile, writeFile } from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';

const lstat = promisify(fs.lstat);
/**
 * Copies a template files from a folder to a target directory, replacing all placeholders
 * in the template with the variable values.
 *
 * Placeholders can look like this: ${VARIABLE_NAME}
 *
 * @param from
 * @param to
 * @param variables
 */
export async function copyTemplate(
  from: string,
  to: string,
  variables: {
    [name: string]: string;
  }
): Promise<void> {
  const fromResolved = path.resolve(from);
  const toResolved = path.resolve(to);
  const files = await glob(path.join(from, '{**/*,*}'), {});
  await Promise.all(
    files.map(async (file) => {
      const stats = await lstat(file);
      const targetPath = path.join(
        toResolved,
        file.substr(fromResolved.length)
      );
      if (stats.isDirectory()) {
        await mkdirp(targetPath);
      } else {
        const content = (await readFile(file)).toString('utf-8');
        const compiledContent = _.template(content, {
          interpolate: /{{([\s\S]+?)}}/g,
        })(variables)
          .split('\r\n')
          .join('\n'); // Remove added carriage returns for windows
        await writeFile(targetPath, compiledContent);
      }
    })
  );
}
