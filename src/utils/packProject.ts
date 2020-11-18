/**
 * Created by Ivo Meißner on 10.09.17.
 *
 * @flow
 */

import AdmZip from 'adm-zip';
import {promisify} from 'es6-promisify';
import fs from 'fs';
import originalGlob from 'glob';
import {IModuleConfig} from 'IModuleConfig';
import {IProjectConfig} from 'IProjectConfig';
import yaml from 'js-yaml';
import path from 'path';
import tar from 'tar';
import {
  PRIVATE_MODULE_NAME_REGEX,
  validateConfig,
  validateModule,
} from '../validation/index';
import execute from './execute';

const glob = promisify(originalGlob);

interface IPackOptions {
  runtimeSources?: boolean;
}

async function pack(root: string, options: IPackOptions = {}): Promise<AdmZip> {
  try {
    const zip = new AdmZip();
    const rawData = fs.readFileSync(
      path.join(root, 'slicknode.yml'),
      'utf8',
    );
    const config = (yaml.safeLoad(rawData) as IProjectConfig) || null;
    const projectConfigErrors = await validateConfig(config);
    if (projectConfigErrors.length) {
      throw projectConfigErrors[0];
    }

    if (!config) {
      throw new Error('No valid slicknode.yml config');
    }

    // Add config
    zip.addLocalFile(path.join(root, 'slicknode.yml'));

    // Add module files
    const promises = Object.keys(config.dependencies)
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

        const moduleRoot = path.resolve(path.join(root, config.dependencies[name]));

        // Load and validate module config
        const data = fs.readFileSync(
          path.join(moduleRoot, 'slicknode.yml'),
          'utf8',
        );
        const moduleConfig = (yaml.safeLoad(data) as IModuleConfig) || null;
        if (!moduleConfig) {
          throw new Error('No valid slicknode.yml config');
        }
        const configErrors = await validateModule(moduleConfig);
        if (configErrors.length) {
          throw configErrors[0];
        }

        // Pack runtime files if we have package.json file in module root and configured runtime
        const buildRuntime = moduleConfig.runtime && options.runtimeSources ? new Promise<void>((resolve, reject) => {
          function onError(err: Error) {
            reject(new Error(`Invalid runtime for module ${name}: ${err.message}`));
          }

          // @TODO: Cache build based on directory checksum
          const packageJson = path.join(moduleRoot, 'package.json');
          fs.access(packageJson, fs.constants.R_OK, (err) => {
            if (err) {
              resolve();
            } else {
              // Create npm package
              execute('npm', [ 'pack' ], null, {
                cwd: moduleRoot,
              })
                .then((archive) => {
                  // Unpack archive and add files to module zip
                  const archivePath = path.join(moduleRoot, archive.trim());

                  // Read entries from tgz file and add to module zip
                  fs.createReadStream(archivePath)
                    .on('close', () => {
                      // Delete created archive file
                      fs.unlink(archivePath, (e) => {
                        if (e) {
                          onError(e);
                        } else {
                          resolve();
                        }
                      });
                    })
                    .on('error', onError)
                    .pipe(tar.t())
                    .on('entry', (entry) => {
                      let buffer = Buffer.alloc(0);
                      entry.on('data', (chunk: Uint8Array) => {
                        buffer = Buffer.concat([ buffer, chunk ]);
                      });
                      entry.on('end', () => {
                        // Remove package/ prefix
                        const entryPath = entry.path.split('/').slice(1).join('/');
                        zip.addFile(`modules/${name}/${entryPath}`, buffer, '', 0o644);
                      });
                    });
                })
                .catch((e) => {
                  onError(new Error(
                    '"npm pack" failed, check your package.json and try to run "npm pack" in module ' +
                    `directory manually to find errors. \n\n${e.message}`,
                  ));
                });
            }
          });
        }) : Promise.resolve();

        const addFiles = patterns.map(async (pattern) => {
          // Add permission files
          const matches = await glob(`${moduleRoot}${path.sep}${pattern}`) as string[];
          (matches || []).forEach((file) => {
            const dirs = pattern.split(path.sep);
            dirs.pop();
            zip.addLocalFile(file, `modules/${name}/${dirs.join('/')}`);
          });
        });

        return await Promise.all([ ...addFiles, buildRuntime ]);
      });

    await Promise.all(promises);

    return new AdmZip(zip.toBuffer());
  } catch (e) {
    throw new Error(`Error packing project: ${e.message}`);
  }
}

export default pack;
