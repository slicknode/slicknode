import {flags} from '@oclif/command';
import chalk from 'chalk';
import fs from 'fs';
import {mkdirpSync, outputFileSync} from 'fs-extra';
import inquirer from 'inquirer';
import Listr from 'listr';
import path from 'path';
import rimraf from 'rimraf';
import tar from 'tar';
import {EnvCommand} from '../../base/env-command';
import {getModuleList} from '../../utils';
import execute from '../../utils/execute';
import {IModuleListItem} from '../../utils/getModuleList';

export class RuntimeBuildCommand extends EnvCommand {
  public static description = 'Builds the source package for the runtime to be deployed';
  public static args = [
    {
      name: 'output',
      description: 'The target output directory or file of the built source bundle',
    },
  ];
  public static flags = {
    ...EnvCommand.flags,
    force: flags.boolean({
      char: 'f',
      description: 'Delete output directory without confirmation if exists',
    }),
  };

  public async run() {
    const input = this.parse(RuntimeBuildCommand);
    const buildDir = path.resolve(input.args.output);
    const env = await this.getEnvironment();

    // Prevent deletion of parent folder
    if (this.getProjectRoot().startsWith(buildDir)) {
      throw new Error('Cannot build into project or parent directory');
    }

    if (fs.existsSync(buildDir)) {
      if (!input.flags.force) {
        const values: any = await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message: (
              `WARNING: The output destination ${input.args.output} already exists. \n` +
              'All content will be deleted! Continue?'
            ),
            default: false,
          },
        ]);

        if (!values.confirm) {
          this.error('Build cancelled');
          return;
        }
      }

      // Delete build folder
      rimraf.sync(buildDir);
    }

    // Create build dir
    mkdirpSync(buildDir);

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
                      task: async (moduleCtx) => {
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
                                  moduleCtx.archivePath = path.join(
                                    item.path,
                                    // Pack outputs the filename as last output,
                                    // ignore all other output from build scripts
                                    archive.trim().split('\n').pop()!.trim(),
                                  );
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
                        });
                      },
                    },
                    {
                      title: 'Copy files',
                      task: async (moduleCtx) => {
                        return await new Promise<void>((resolve, reject) => {
                          function onError(err: Error) {
                            reject(new Error(`Error extracting files: ${err.message}`));
                          }

                          // Read entries from tgz file and add to module zip
                          fs.createReadStream(moduleCtx.archivePath)
                            .on('close', () => {
                              // Delete created archive file
                              fs.unlink(moduleCtx.archivePath, (e) => {
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
                                outputFileSync(
                                  path.join(buildDir, `modules/${item.config.module.id}/${entryPath}`),
                                  buffer,
                                );
                                // zip.addFile(`modules/${item.config.module.id}/${entryPath}`, buffer, '', 0o644);
                              });
                            });
                        });
                      },
                    },
                  ]);
                },
              })),
          );
        },
      },
      {
        title: 'Add meta files',
        task: async (ctx) => {
          let name = 'unnamed-slicknode-runtime';
          if (env) {
            name = `${env.alias}-slicknode-runtime`;
          }

          // Build dependency and module package map
          const dependencies: {[name: string]: string} = {
            'slicknode-runtime': '~0.2.0',
          };
          const modulePackageMap: {[moduleId: string]: string} = {};
          for (const item of ctx.modules) {
            if (item.config.runtime) {
              // Read package name
              const modulePackageJson = fs.readFileSync(path.resolve(item.path, 'package.json'), 'utf8');
              const depName = JSON.parse(modulePackageJson).name;
              dependencies[depName] = `file:./modules/${item.config.module.id}`;
              modulePackageMap[item.config.module.id] = depName;
            }
          }

          // Get slicknode CLI version
          const cliVersion = this.config.version;

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
          /*
          zip.addFile(
            `package.json`,
            Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'),
            '',
            0o644
          );
          */
          outputFileSync(
            path.join(buildDir, 'package.json'),
            Buffer.from(JSON.stringify(packageJson, null, 2)),
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
            "const {SlicknodeRuntime} = require('slicknode-runtime');", '',
            'const runtime = new SlicknodeRuntime();',
          ];
          for (const moduleId in modulePackageMap) {
            if (modulePackageMap.hasOwnProperty(moduleId)) {
              runtimeLines.push(
                `runtime.register('${moduleId}', '${modulePackageMap[moduleId]}');`,
              );
            }
          }
          runtimeLines.push('');
          runtimeLines.push('exports.default = runtime;');
          runtimeLines.push('');

          outputFileSync(
            path.join(buildDir, 'runtime.js'),
            Buffer.from(runtimeLines.join('\n'), 'utf-8'),
          );

          // @TODO: Add different deployment targets (cloudfunction, lambda, docker etc.)
          outputFileSync(
            path.join(buildDir, 'index.js'),
            Buffer.from(fs.readFileSync(path.join(__dirname, '../../templates/runtime/cloudfunction/index.js'))),
          );
        },
      },
      {
        title: `Build complete: ${path.resolve(input.args.output)}`,
        task: async () => {
          // zip.writeZip(path.resolve(this.args.output));
        },
      },
    ]);
    await tasks.run();

    const functionName = env ? `${env.alias}-runtime` : 'my-slicknode-runtime';
    this.log(`
Deploy the build to the google cloud, for example:

  gcloud functions deploy ${functionName} \\
    --runtime nodejs10 \\
    --allow-unauthenticated \\
    --trigger-http \\
    --source ${input.args.output} \\
    --region us-east1

Refer to the google cloud functions docs for more information.
`);
  }
}
