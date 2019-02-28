/**
 * Created by Ivo Meißner on 30.08.17.
 */

import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import path from 'path';
import {
  sortKeys,
} from '../../../utils/index';
import {
  MODULE_LABEL_MAX_LENGTH,
  NAMESPACE_REGEX,
  PUBLIC_MODULE_NAME_REGEX,
} from '../../../validation/constants';
import Command from '../../Command';

interface IModuleCreateCommandOptions {
  namespace?: string;
  label?: string;
}
interface IModuleCreateCommandArguments {
  name: string;
}

export class ModuleCreateCommand extends Command<IModuleCreateCommandOptions, IModuleCreateCommandArguments> {
  public static command = 'module create';
  public static description = 'Creates a new module';

  public static args = [
    {
      name: '<name>',
      description: 'The name of the module',
      validator: PUBLIC_MODULE_NAME_REGEX,
    },
  ];

  public static options = [
    {
      name: '-n, --namespace <namespace>',
      description: 'The namespace of the module',
      validator: NAMESPACE_REGEX,
    },
    {
      name: '-l, --label <label>',
      description: 'The label as displayed in the admin interface',
    },
  ];

  public async run() {
    // Check if module with that name already exists
    const config = await this.getConfig();
    if (!config) {
      return;
    }
    const moduleId = `@private/${this.args.name}`;
    if (config.dependencies.hasOwnProperty(moduleId)) {
      throw new Error(`An module with the name ${this.args.name} already exists in the project`);
    }

    let namespace = this.options.namespace;
    if (!namespace) {
      let defaultNamespace = _.startCase(this.args.name.replace('-', ' ')).replace(/\s/g, '');
      if (!defaultNamespace.match(NAMESPACE_REGEX)) {
        defaultNamespace = null;
      }
      const values = await inquirer.prompt([
        {
          name: 'namespace',
          message: 'Enter the namespace for the module',
          default: defaultNamespace,
          validate: (input) => {
            if (!input.match(NAMESPACE_REGEX)) {
              return 'Please enter a valid namespace. It needs to start with an uppercase ' +
                'letter and can only contain alpha numeric characters';
            }
            return true;
          },
        },
      ]) as {namespace: string};
      namespace = values.namespace;
    }

    let label = this.options.label;
    if (!label) {
      const defaultLabel = _.startCase(this.args.name.replace('-', ' '));
      const labelValues = await inquirer.prompt([
        {
          name: 'label',
          message: 'Enter the module label for the admin interface',
          default: defaultLabel,
          validate: (input) => {
            if (input.length > 0 && input.length <= MODULE_LABEL_MAX_LENGTH) {
              return true;
            }
            return `Please enter a valid label for the module (Max ${MODULE_LABEL_MAX_LENGTH} characters)`;
          },
          filter: _.trim,
        },
      ]) as {label: string};
      label = labelValues.label;
    }

    try {
      // @TODO: Check of unique namespace

      // Create modules dir
      const moduleDir = path.join(this.getDefaultModulesDir(), this.args.name);
      mkdirp.sync(moduleDir);
      this.logger.debug('Created module folder: ' + moduleDir);

      // Write slicknode.yml file for new module
      const moduleConfig = {
        module: {
          id: moduleId,
          namespace,
          label,
        },
      };
      fs.writeFileSync(
        path.join(moduleDir, 'slicknode.yml'),
        yaml.safeDump(sortKeys(moduleConfig), {
          indent: 2,
        }),
      );

      // Create empty schema.graphql
      fs.writeFileSync(
        path.join(moduleDir, 'schema.graphql'),
        '',
      );

      // Add module to slicknode.yml
      const relModulePath = '.' + moduleDir.substr(this.getProjectRoot().length);
      const newConfig = {
        ...config,
        dependencies: {
          ...config.dependencies,
          [moduleConfig.module.id]: relModulePath,
        },
      };
      fs.writeFileSync(
        path.join(this.getProjectRoot(), 'slicknode.yml'),
        yaml.safeDump(sortKeys(newConfig), {
          indent: 2,
        }),
      );

      this.logger.log(chalk.green(`
  SUCCESS! Module was created

  Add your type definitions to ${relModulePath}/schema.graphql

  Afterwards run ${chalk.bold('slicknode deploy')} to deploy the changes
  `,
      ));
    } catch (e) {
      this.logger.error(chalk.red('Could not create module: ' + e.message));
    }

  }
}
