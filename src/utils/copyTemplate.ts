import originalGlob from 'glob';
import {promisify} from 'util';
const glob = promisify(originalGlob);
import {readFile, writeFile} from 'fs-extra';
import _ from 'lodash';
import path from 'path';

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
    [name: string]: string,
  },
): Promise<void> {
  const fromResolved = path.resolve(from);
  const toResolved = path.resolve(to);
  const files = await glob(path.join(from, '**/*'));
  await Promise.all(files.map(async (file) => {
    const content = (await readFile(file)).toString('utf-8');
    const compiledContent = _.template(content)(variables);
    const targetFile = path.join(toResolved, file.substr(fromResolved.length));
    await writeFile(targetFile, compiledContent);
  }));
}
