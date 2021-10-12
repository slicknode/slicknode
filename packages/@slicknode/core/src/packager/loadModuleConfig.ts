import { ModuleConfig } from '../definition';
import yaml from 'js-yaml';
import AdmZip from 'adm-zip';
import { unpack } from './index';
import path from 'path';
import fs from 'fs';
import originalGlob from 'glob';
import { promisify } from 'util';
import { REQUIRED_TENANT_MODULES } from '../config';

const glob = promisify(originalGlob);

/**
 * Loads a module config from a directory
 * @param dir
 */
export async function loadModuleConfig(dir: string): Promise<ModuleConfig> {
  // Create zip file
  const zip = new AdmZip();

  const patterns = [
    'schema.graphql',
    'README.md',
    'slicknode.yml',
    'settings.graphql',
    'package.json',
    'permissions/*.graphql',
  ];

  const moduleRoot = path.resolve(dir);

  // Load and validate module config
  const data = fs.readFileSync(path.join(moduleRoot, 'slicknode.yml'), 'utf8');
  const moduleConfig = yaml.safeLoad(data) || null;
  if (!moduleConfig || typeof moduleConfig !== 'object') {
    throw new Error('No valid slicknode.yml config');
  }

  // @TODO: Add validation, types

  // Add root config
  const name = (moduleConfig as any).module.id;
  const projectConfig = {
    dependencies: {
      // Add required modules temporarily
      ...REQUIRED_TENANT_MODULES.reduce((map, tmpName) => {
        return {
          ...map,
          [tmpName]: 'latest',
        };
      }, {}),
      [name]: `./modules/${name}/`,
    },
  };

  zip.addFile('slicknode.yml', Buffer.from(yaml.dump(projectConfig), 'utf8'));
  // zip.addLocalFile(path.join(dir, 'slicknode.yml'));

  const addFiles = patterns.map(async (pattern) => {
    // Add permission files
    const matches = await glob(`${moduleRoot}/${pattern}`);
    (matches || []).forEach((file) => {
      const dirs = pattern.split('/');
      dirs.pop();
      zip.addLocalFile(file, `modules/${name}/${dirs.join('/')}`);
    });
  });

  await Promise.all(addFiles);

  const result = await unpack(zip);
  if (result.errors.length) {
    throw new Error(
      `Invalid config in config dir: ${result.errors
        .map((err) => err.message)
        .join('\n')}`
    );
  }

  // Drop core modules and return loaded module config
  return result.modules.find((module) => module.id === name);
}
