import chalk from 'chalk';
import Listr from 'listr';
import {getModuleList} from '../utils';
import Command from './Command';
import {isDirectory} from '../validation/options';
import {IModuleListItem} from '../utils/getModuleList';
import tar from 'tar';
import fs from "fs";
import path from "path";
import execute from '../utils/execute';
import AdmZip from 'adm-zip';
import program from "caporal";

interface IRuntimeBuildCommandOptions {
  dir?: string;
  env?: string;
}

interface IRuntimeBuildCommandArguments {
  output: string;
}

export default class RuntimeBuildCommand extends Command<IRuntimeBuildCommandOptions, IRuntimeBuildCommandArguments> {
  public static command = 'runtime build';
  public static description = 'Builds the source package for the runtime to be deployed';
  public static options = [
    {
      name: '-d, --dir <path>',
      description: 'The project directory, if other than current',
      validator: isDirectory,
    },
    {
      name: '-e, --env <env>',
      description: 'The configured environment name',
    },
  ];
  public static args = [
    {
      name: '<output>',
      description: 'The target output directory or file of the built source bundle',
    },
  ];

  public async run() {
    const zip = new AdmZip();
    const tasks = new Listr([
      {
        title: 'Load and validate modules',
        task: async (ctx) => {
          ctx.modules = await getModuleList(this.getProjectRoot());
        },
      },
      {
        title: 'Build modules',
        task: async (ctx) => {
          return new Listr(
            (ctx.modules as IModuleListItem[])
              .filter((item) => item.config.runtime)
              .map((item) => ({
                title: `Module "${item.config.module.id}"`,
                task: () => {
                  return new Listr([
                    {
                      title: 'Install dependencies',
                      task: async () => {
                        await execute('npm', [ 'install' ], null, {
                          cwd: item.path,
                        });
                      },
                    },
                    {
                      title: 'Pack module',
                      task: async (ctx) => {
                        return await new Promise<void>((resolve, reject) => {
                          const packageJson = path.join(item.path, 'package.json');
                          fs.access(packageJson, fs.constants.R_OK, (err) => {
                            if (err) {
                              reject(err);
                            } else {
                              // Create npm package
                              execute('npm', [ 'pack' ], null, {
                                cwd: item.path,
                              })
                                .then((archive) => {
                                  // Unpack archive and add files to module zip
                                  ctx.archivePath = path.join(item.path, archive.trim());
                                  resolve();
                                })
                                .catch((e) => {
                                  reject(new Error(
                                    '"npm pack" failed, check your package.json and try to run "npm pack" in module ' +
                                    `directory manually to find errors. \n\n${e.message}`,
                                  ));
                                });
                            }
                          });
                        })
                      },
                    },
                    {
                      title: 'Copy files',
                      task: async (ctx) => {
                        return await new Promise<void>((resolve, reject) => {
                          function onError(err: Error) {
                            reject(new Error(`Error extracting files: ${err.message}`));
                          }

                          // Read entries from tgz file and add to module zip
                          fs.createReadStream(ctx.archivePath)
                            .on('close', () => {
                              // Delete created archive file
                              fs.unlink(ctx.archivePath, (e) => {
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
                                // console.log('Add entry path', entryPath);
                                zip.addFile(`modules/${item.config.module.id}/${entryPath}`, buffer, '', 0o644);
                              });
                            });
                        })
                      }
                    },
                  ]);
                },
              }))
          );
        },
      },
      {
        title: 'Add meta files',
        task: async (ctx) => {
          const env = await this.getEnvironment();
          let name = 'unnamed-slicknode-runtime';
          if (env) {
            name = `${env.alias}-slicknode-runtime`;
          }

          // Build dependency and module package map
          const dependencies: {[name: string]: string} = {
            'slicknode-runtime': 'https://github.com/slicknode/slicknode-runtime.git'
          };
          const modulePackageMap: {[moduleId: string]: string} = {};
          for (let item of ctx.modules) {
            if (item.config.runtime) {
              // Read package name
              const modulePackageJson = fs.readFileSync(path.resolve(item.path, 'package.json'), 'utf8');
              const depName = JSON.parse(modulePackageJson).name;
              dependencies[depName] = `file:./modules/${item.config.module.id}`;
              modulePackageMap[item.config.module.id] = depName;
            }
          }

          // Get slicknode CLI version
          const data = fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8');
          const cliVersion = JSON.parse(data).version || '0.0.0';

          // Add package.json
          const packageJson = {
            name,
            version: '1.0.0',
            description: '',
            main: 'index.js',
            keywords: ['slicknode'],
            author: `Slicknode CLI ${cliVersion}`,
            license: 'ISC',
            dependencies,
          };
          zip.addFile(
            `package.json`,
            Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'),
            '',
            0o644
          );

          // Generate runtime.js
          const runtimeLines = [
            '/** ',
            ' * Slicknode Runtime',
            ' * ',
            ` * Generated by Slicknode CLI ${cliVersion}`,
            ` * Date: ${new Date().toLocaleString()}`,
            ' */',
            '',
            `const SlicknodeRuntime = require('slicknode-runtime');`, '',
            'const runtime = new SlicknodeRuntime();'
          ];
          for (let moduleId in modulePackageMap) {
            runtimeLines.push(
              `runtime.register('${moduleId}', '${modulePackageMap[moduleId]}');`
            );
          }
          runtimeLines.push('');
          runtimeLines.push('module.export = runtime;');
          runtimeLines.push('');
          zip.addFile(
            `runtime.js`,
            Buffer.from(runtimeLines.join('\n'), 'utf-8'),
            '',
            0o644
          );
        },
      },
      {
        title: 'Write deployment file',
        task: async () => {
          zip.writeZip(path.resolve(this.args.output));
        },
      }
    ]);
    await tasks.run();
  }

  protected buildModules = async () => {
    const list = await getModuleList(this.getProjectRoot());
    return new Listr(
      list
        .filter((item) => item.config.runtime)
        .map((item) => ({
          title: `Module "${item.config.module.id}"`,
          task: () => {
            return new Listr([
              {
                title: 'Install dependencies',
                task: () => {
                  return new Promise(resolve => setTimeout(resolve, 1000));
                }
              }
            ]);
            console.log('test');
            throw new Error(JSON.stringify(list));
          },
        }))
    );
  }
}
