/**
 * Created by Ivo Meißner on 23.01.19
 *
 */
/* eslint-disable no-sync */
import { ModuleConfig } from '../../definition';
import AdmZip from 'adm-zip';
import { unpack } from '../../packager';
import yaml from 'js-yaml';
import path from 'path';
import fs from 'fs';
import originalGlob from 'glob';
import { promisify } from 'util';

const PRIVATE_MODULE_NAME_REGEX = /^@private\/([a-z0-9]+)((-[a-z0-9]+)*)$/;
const glob = promisify(originalGlob);

/**
 * Converts a folder into an array of ModuleConfig objects
 * @param folder
 * @returns {Promise<void>}
 */
export async function buildModules(
  folder: string
): Promise<Array<ModuleConfig>> {
  const rawData = fs.readFileSync(path.join(folder, 'slicknode.yml'), 'utf8');
  const config =
    (yaml.safeLoad(rawData) as { dependencies: Record<string, string> }) ||
    null;
  if (!config || typeof config !== 'object') {
    throw new Error('Could not load slicknode.yml');
  }
  const zip = new AdmZip();

  // Add config
  zip.addLocalFile(path.join(folder, 'slicknode.yml'));

  // Add module files
  const promises = Object.keys(config.dependencies || {})
    // Only add private modules
    .filter((name) => name.match(PRIVATE_MODULE_NAME_REGEX))
    .map(async (name) => {
      const patterns = [
        'schema.graphql',
        'README.md',
        'slicknode.yml',
        'settings.graphql',
        'package.json',
        'permissions/*.graphql',
      ];

      const moduleRoot = path.resolve(
        path.join(folder, config.dependencies[name])
      );

      // Load and validate module config
      const data = fs.readFileSync(
        path.join(moduleRoot, 'slicknode.yml'),
        'utf8'
      );
      const moduleConfig = yaml.safeLoad(data) || null;
      if (!moduleConfig) {
        throw new Error('No valid slicknode.yml config');
      }

      const addFiles = patterns.map(async (pattern) => {
        // Add permission files
        const matches = await glob(`${moduleRoot}/${pattern}`);
        (matches || []).forEach((file) => {
          const dirs = pattern.split('/');
          dirs.pop();
          zip.addLocalFile(file, `modules/${name}/${dirs.join('/')}`);
        });
      });

      return await Promise.all(addFiles);
    });

  await Promise.all(promises);
  // console.log(zip.getEntries().map(entry => entry.entryName));

  const result = await unpack(zip);
  if (result.errors.length) {
    throw new Error(
      `Invalid config in config dir: ${result.errors
        .map((err) => err.message)
        .join('\n')}`
    );
  }
  return result.modules;
}

export default buildModules;
