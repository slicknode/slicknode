import chalk from 'chalk';
import fs from 'fs';
import yaml from 'js-yaml';
import * as _ from 'lodash';
import * as path from 'path';
import { BaseCommand } from '../../base/base-command';
import { sortKeys } from '../../utils';
import { PUBLIC_MODULE_NAME_REGEX } from '../../validation';

export default class ModuleAddCommand extends BaseCommand {
  public static description = 'Add modules as a dependency to the project';
  public static strict = false;

  public static args = [
    {
      name: '[names]',
      description: 'The names of the modules to add',
      required: true,
    },
  ];

  public static flags = {
    ...BaseCommand.flags,
  };

  public async run() {
    // Check if module with that name already exists
    const input = this.parse(ModuleAddCommand);
    const config = await this.getConfig();
    if (!config) {
      return;
    }
    const names = input.argv;
    names.forEach((name) => {
      if (!name.match(PUBLIC_MODULE_NAME_REGEX)) {
        throw new Error(`Invalid module name "${name}" provided`);
      }
    });

    // Ignore already installed modules
    const newModules = names.filter((name) => {
      const exists = config.dependencies.hasOwnProperty(name);
      if (exists) {
        this.log(chalk.yellow(`Module "${name}" is already installed`));
      }
      return !exists;
    });

    // Check if modules are available
    const result = await this.getClient().fetch(LIST_MODULES_QUERY, {
      modules: newModules,
    });
    const availableModules = _.get(
      result,
      'data.listRegistryModule.edges',
      []
    ).map(({ node }: { node: { name: string } }) => node.name);

    const unavailableModules = _.difference(newModules, availableModules);
    if (unavailableModules.length) {
      throw new Error(
        `Module${
          unavailableModules.length > 1 ? 's' : ''
        } "${unavailableModules.join('", "')}" not found in registry`
      );
    }

    const newConfig = {
      ...config,
      dependencies: {
        ...config.dependencies,
        ...newModules.reduce((deps: { [key: string]: string }, name) => {
          deps[name] = 'latest';
          return deps;
        }, {} as { [key: string]: string }),
      },
    };
    fs.writeFileSync(
      path.join(this.getProjectRoot(), 'slicknode.yml'),
      yaml.safeDump(sortKeys(newConfig), {
        indent: 2,
      })
    );
    newModules.forEach((name) => {
      this.log(chalk.green(`+ Module "${name}" added - version: latest`));
    });
    if (newModules.length) {
      this.log(
        '\nRun `slicknode deploy` to deploy the changes to the server.\n'
      );
    }
  }
}

export const LIST_MODULES_QUERY = `query ListModulesQuery($modules: [String!]!) {
  listRegistryModule(filter: {node: {name: {in: $modules}}}) {
    edges {
      node {
        name
      }
    }
  }
}`;
