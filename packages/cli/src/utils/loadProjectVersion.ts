/**
 * Created by Ivo Meißner on 03.10.17.
 *
 * @flow
 */
import AdmZip from 'adm-zip';
import fs, { mkdirpSync } from 'fs-extra';
import yaml from 'js-yaml';
import * as _ from 'lodash';
import fetch from 'node-fetch';
import os from 'os';
import * as path from 'path';
import * as uuid from 'uuid';

/**
 * Loads the project version + files from the server and writes them to local project dir
 */
async function loadProjectVersion(
  projectRoot: string,
  bundle: string
): Promise<void> {
  if (!bundle) {
    throw new Error('No bundle URL provided');
  }
  const response = await fetch(bundle);

  const tmpFile = path.join(os.tmpdir(), uuid.v1() + '.zip');
  try {
    fs.writeFileSync(tmpFile, await response.buffer());
  } catch (e) {
    throw new Error('Could not write bundle to disk: ' + e.message);
  }

  // Unzip all module data to slicknode cache dir
  const zip = new AdmZip(tmpFile);
  const moduleCacheDir = path.join(projectRoot, '.slicknode', 'cache');

  // Unzip config
  const rawConfig = zip.readAsText('slicknode.yml', 'utf8');
  const config = yaml.safeLoad(rawConfig);

  zip.extractEntryTo('slicknode.yml', projectRoot, false, true);
  zip.getEntries().forEach((entry) => {
    // If we have private module, unzip to target folder, otherwise unpack
    // to project cache folder
    if (entry.entryName.startsWith('modules/@private')) {
      const moduleName = entry.entryName.split('/').slice(1, 3).join('/');

      // @TODO: Memoize resolved module path
      const version = _.get(config, `dependencies["${moduleName}"]`, '');
      if (version.startsWith('./')) {
        const modulePath = path.resolve(projectRoot, version);
        if (!modulePath) {
          throw new Error(
            `The target directory for module ${moduleName} does not exist: ${modulePath}`
          );
        }

        // Strip module and filename from entryTarget
        const targetPathParts = entry.entryName.split('/').slice(1);
        targetPathParts.pop();
        const entryTarget = path.join(
          modulePath,
          targetPathParts.join(path.sep).substr(moduleName.length)
        );
        zip.extractEntryTo(entry.entryName, entryTarget, false, true);
        return;
      }
    }

    zip.extractEntryTo(entry.entryName, moduleCacheDir, true, true);
  });

  mkdirpSync(moduleCacheDir);

  zip.extractAllTo(moduleCacheDir, true);

  try {
    // Cleanup
    fs.unlink(tmpFile);
  } catch (e) {
    console.log('Temporary file was not deleted: ' + e.message); // tslint:disable-line no-console
  }

  // Copy config
  await fs.copy(
    path.join(moduleCacheDir, 'slicknode.yml'),
    path.join(projectRoot, 'slicknode.yml')
  );
}

export default loadProjectVersion;
