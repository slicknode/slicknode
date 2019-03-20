/**
 * Created by Ivo Meißner on 30.08.17.
 */

import chalk from 'chalk';
import fs from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import {
  sortKeys,
} from '../../../utils';
import {
  PUBLIC_MODULE_NAME_REGEX,
} from '../../../validation';
import {Command} from '../../command';

interface IModuleAddCommandOptions {}
interface IModuleAddCommandArguments {
  names: string[];
}

export class ModuleAddCommand extends Command<IModuleAddCommandOptions, IModuleAddCommandArguments> {
  public static command = 'module add';
  public static description = 'Adds a module as a dependency to the project';

  public static args = [
    {
      name: '[names...]',
      description: 'The names of the modules to add',
      validator: (values: string[]) => {
        values.forEach((name) => {
          if (!name.match(PUBLIC_MODULE_NAME_REGEX)) {
            throw new Error(`Invalid module name "${name}" provided`);
          }
        });
        return values;
      },
    },
  ];

  public async run() {
    // Check if module with that name already exists
    const config = await this.getConfig();
    if (!config) {
      return;
    }
    const names = this.args.names;

    // Ignore already installed modules
    const newModules = names
      .filter((name) => {
        const exists = config.dependencies.hasOwnProperty(name);
        if (exists) {
          this.logger.info(chalk.yellow(`Module "${name}" is already installed`));
        }
        return !exists;
      });

    // Check if modules are available
    const query = `query ListModulesQuery($modules: [String!]!) {
      listRegistryModule(filter: {node: {name: {in: $modules}}}) {
        edges {
          node {
            name
          }
        }
      }
    }`;
    const result = await this.client.fetch(query, {modules: newModules});
    const availableModules = _.get(result, 'data.listRegistryModule.edges', []).map(
      ({node}: {node: {name: string}}) => node.name,
    );

    const unavailableModules = _.difference(newModules, availableModules);
    if (unavailableModules.length) {
      throw new Error(
        `Module${unavailableModules.length > 1 ? 's' : ''} "${unavailableModules.join('", "')}" not found in registry`,
      );
    }

    const newConfig = {
      ...config,
      dependencies: {
        ...config.dependencies,
        ...newModules.reduce((deps: {[key: string]: string}, name) => {
          deps[name] = 'latest';
          return deps;
        }, {} as {[key: string]: string}),
      },
    };
    fs.writeFileSync(
      path.join(this.getProjectRoot(), 'slicknode.yml'),
      yaml.safeDump(sortKeys(newConfig), {
        indent: 2,
      }),
    );
    newModules.forEach((name) => {
      this.logger.log(chalk.green(`+ Module "${name}" added - version: latest`));
    });
    if (newModules.length) {
      this.logger.log('\nRun `slicknode deploy` to deploy the changes to the server.\n');
    }
  }
}
