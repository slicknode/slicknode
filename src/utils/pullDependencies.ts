import AdmZip from 'adm-zip';
import cli from 'cli-ux';
import {mkdirp, remove} from 'fs-extra';
import _ from 'lodash';
import fetch from 'node-fetch';
import path from 'path';
import rimraf from 'rimraf';
import Client from 'slicknode-client';
import {IProjectConfig} from '../types';

interface IPullDependenciesParams {
  config: IProjectConfig;
  dir: string;
  client: Client;
  repositoryUrl?: string;
}

export const GET_REPOSITORY_URL_QUERY = '{repositoryUrl}';

/**
 *
 * @param params
 */
export async function pullDependencies(params: IPullDependenciesParams) {
  const {config, dir, client} = params;
  cli.action.start('Updating dependencies');

  // Get repository URL
  let repositoryUrl = params.repositoryUrl;
  if (!repositoryUrl) {
    const result = await client.fetch(GET_REPOSITORY_URL_QUERY);

    repositoryUrl = _.get(result, 'data.repositoryUrl');
    if (!repositoryUrl) {
      throw new Error('Failed to load repository URL from API. Are you offline? Please try again');
    }
  }

  for (const id of Object.keys(config.dependencies)) {
    try {
      // Load module details from registry
      const result = await fetch(`${repositoryUrl}${id}`);
      const data = await result.json();

      // Check if version is tag, get right zip URL
      const version = config.dependencies[id];
      const resolvedVersion = _.get(data, `tags.${version}`, version);

      const zipUrl = _.get(data, `versions["${resolvedVersion}"].dist.zip`);
      if (!zipUrl) {
        throw new Error(`Version "${version}" could not be found`);
      }

      // Fetch actual source bundle
      const bundle = await fetch(zipUrl);
      const zip = new AdmZip(await bundle.buffer());

      // Create directory if does not exist
      const moduleDir = path.join(dir, '.slicknode', 'cache', 'modules', id);

      // Recreate empty module dir
      await remove(moduleDir);
      await mkdirp(moduleDir);

      // Exctract entries to target path
      for (const entry of zip.getEntries()) {
        if (entry.entryName.startsWith('module/')) {
          // Remove /module from path
          const targetEntryPath = path.join(moduleDir, entry.entryName.substring(7));
          if (entry.isDirectory) {
            await mkdirp(targetEntryPath);
          } else {
            const targetDir = targetEntryPath.split('/');
            targetDir.pop();
            zip.extractEntryTo(entry.entryName, targetDir.join('/'), false, true);
          }
        }
      }
    } catch (e) {
      throw new Error(`Update of module ${id} failed: ${e.message}`);
    }
    cli.action.stop();
  }
}
