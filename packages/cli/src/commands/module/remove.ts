import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import rimraf from 'rimraf';
import { BaseCommand } from '../../base/base-command';
import { sortKeys } from '../../utils';
import { PUBLIC_MODULE_NAME_REGEX } from '../../validation';

export default class ModuleRemoveCommand extends BaseCommand {
  public static description = 'Remove modules as a dependency from the project';
  public static strict = false;

  public static args = [
    {
      name: '[names]',
      description: 'The names of the modules to remove',
      required: true,
    },
  ];

  public static flags = {
    ...BaseCommand.flags,
  };

  public async run() {
    // Check if module with that name already exists
    const input = this.parse(ModuleRemoveCommand);
    const config = await this.getConfig();
    if (!config) {
      throw new Error(
        'No Slicknode project config found. Did you execute the command in the right folder?'
      );
    }
    const names = input.argv;
    const removedDirs: string[] = [];
    names.forEach((name) => {
      if (!config.dependencies.hasOwnProperty(name)) {
        throw new Error(`Module "${name}" not found in the project`);
      }
      if (!name.match(PUBLIC_MODULE_NAME_REGEX)) {
        removedDirs.push(config.dependencies[name]);
      }
    });
    const projectRoot = this.getProjectRoot();

    // Remove files
    if (removedDirs.length) {
      this.log('Module directories:\n');

      this.log(removedDirs.join('\n') + '\n');
      const values = (await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message:
            'Do you want to delete the folders from your file system? WARNING: This cannot be reversed!',
          default: false,
        },
      ])) as { confirm: boolean };
      if (values.confirm) {
        const promises = removedDirs.map(
          (dir) =>
            new Promise((resolve, reject) => {
              rimraf(path.join(projectRoot, dir), (err) => {
                if (err) {
                  reject(err);
                } else {
                  resolve();
                }
              });
            })
        );
        await Promise.all(promises);
      }
    }

    const newConfig = {
      ...config,
      dependencies: {
        ..._.omit(config.dependencies, names),
      },
    };
    fs.writeFileSync(
      path.join(projectRoot, 'slicknode.yml'),
      yaml.safeDump(sortKeys(newConfig), {
        indent: 2,
      })
    );
    names.forEach((name) => {
      this.log(chalk.red(`- Module "${name}" removed`));
    });

    this.log('Run `slicknode deploy` to deploy the changes.');
  }
}
