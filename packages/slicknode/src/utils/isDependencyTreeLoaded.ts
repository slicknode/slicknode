import { pathExists } from 'fs-extra';
import { IProjectConfig } from 'IProjectConfig';
import * as path from 'path';
import { PRIVATE_MODULE_NAME_REGEX } from '../validation';

interface IIsDependencyTreeLoadedParams {
  dir: string;
  config: IProjectConfig;
}

/**
 * Checks if the dependency source files of a project are loaded within a specific directory
 * Returns true if loaded, otherwise false
 *
 * @param params
 */
export async function isDependencyTreeLoaded(
  params: IIsDependencyTreeLoadedParams
) {
  const { dir, config } = params;
  const moduleCacheDir = path.join(dir, '.slicknode', 'cache', 'modules');
  const cacheDirExists = await pathExists(moduleCacheDir);
  if (!cacheDirExists) {
    return false;
  }

  for (const moduleId of Object.keys(config.dependencies)) {
    const isPrivate = moduleId.match(PRIVATE_MODULE_NAME_REGEX);
    let moduleDir = path.join(moduleCacheDir, moduleId);
    if (isPrivate) {
      moduleDir = path.resolve(dir, config.dependencies[moduleId]);
    }
    if (!(await pathExists(moduleDir))) {
      return false;
    }
  }

  return true;
}
