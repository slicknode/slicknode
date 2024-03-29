/**
 * Created by Ivo Meißner on 30.08.17.
 */

import { flags } from '@oclif/command';
import chalk from 'chalk';
import fs from 'fs';
import { mkdirpSync } from 'fs-extra';
import { printSchema } from 'graphql';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import * as _ from 'lodash';
import * as path from 'path';
import { BaseCommand } from '../../base/base-command';
import * as parsers from '../../parsers';
import { getRemoteSchema, sortKeys } from '../../utils';
import { copyTemplate } from '../../utils/copyTemplate';
import {
  MODULE_LABEL_MAX_LENGTH,
  NAMESPACE_REGEX,
  PUBLIC_MODULE_NAME_REGEX,
} from '../../validation/constants';

export default class ModuleCreateCommand extends BaseCommand {
  public static command = 'module create';
  public static description = 'Creates a new module';

  public static args = [
    {
      name: 'name',
      description: 'The name of the module',
      required: true,
      parse: (value: string) => {
        if (!value.match(PUBLIC_MODULE_NAME_REGEX)) {
          throw new Error(
            'The module name is invalid, it can only contain letters, numbers and hyphens'
          );
        }
        return value;
      },
    },
  ];

  public static flags = {
    ...BaseCommand.flags,
    namespace: flags.string({
      char: 'n',
      description: 'The namespace of the module',
      parse: parsers.namespace,
      required: false,
    }),
    label: flags.string({
      char: 'l',
      description: 'The label as displayed in the admin interface',
      required: false,
    }),
    endpoint: flags.string({
      char: 'e',
      description: 'The GraphQL API endpoint to create a remote module',
      required: false,
      parse: parsers.url({
        protocols: ['http', 'https'],
      }),
    }),
    header: flags.string({
      char: 'h',
      description: 'HTTP headers to be sent to the remote GraphQL API endpoint',
      required: false,
      multiple: true,
      parse: (value) => {
        if (!value.match(/^([\w-]+):(.*)$/g)) {
          throw new Error(
            'Please enter a valid header name in the format "Name: Value"'
          );
        }
        return value;
      },
    }),
  };

  public async run() {
    // Check if module with that name already exists
    const input = this.parse(ModuleCreateCommand);

    const config = await this.getConfig();
    if (!config) {
      return;
    }

    const moduleId = `@private/${input.args.name}`;
    if (config.dependencies.hasOwnProperty(moduleId)) {
      throw new Error(
        `An module with the name ${input.args.name} already exists in the project`
      );
    }

    let namespace = input.flags.namespace;

    if (!namespace) {
      let defaultNamespace: string | null = _.startCase(
        input.args.name.replace('-', ' ')
      ).replace(/\s/g, '');
      if (!defaultNamespace!.match(NAMESPACE_REGEX)) {
        defaultNamespace = null;
      }
      const values = (await inquirer.prompt([
        {
          name: 'namespace',
          message: 'Enter the namespace for the module',
          default: defaultNamespace,
          validate: (value) => {
            if (!value.match(NAMESPACE_REGEX)) {
              return (
                'Please enter a valid namespace. It needs to start with an uppercase ' +
                'letter and can only contain alpha numeric characters'
              );
            }
            return true;
          },
          filter: (value) => _.trim(value),
        },
      ])) as { namespace: string };
      namespace = values.namespace;
    }

    let label = input.flags.label;
    if (!label) {
      const defaultLabel = _.startCase(input.args.name.replace('-', ' '));
      const labelValues = (await inquirer.prompt([
        {
          name: 'label',
          message: 'Enter the module label for the admin interface',
          default: defaultLabel,
          validate: (value) => {
            if (value.length > 0 && value.length <= MODULE_LABEL_MAX_LENGTH) {
              return true;
            }
            return `Please enter a valid label for the module (Max ${MODULE_LABEL_MAX_LENGTH} characters)`;
          },
          filter: (value) => _.trim(value),
        },
      ])) as { label: string };
      label = labelValues.label;
    }

    // Variables for module templates
    const moduleVariables = {
      MODULE_ID: moduleId,
      MODULE_NAMESPACE: namespace,
      MODULE_LABEL: label,
    };

    // Create module dir
    const moduleDir = path.join(this.getDefaultModulesDir(), input.args.name);
    try {
      mkdirpSync(moduleDir);
    } catch (e: any) {
      return this.error(
        chalk.red('Could not create module directory: ' + e.message)
      );
    }

    try {
      // Introspect GraphQL API and create remote module
      const endpoint = input.flags.endpoint;
      if (endpoint) {
        // We have remote module, build config via introspection
        const headers = ((input.flags.header || []) as string[]).reduce(
          (h: { [name: string]: string }, value) => {
            const parts: string[] = value.split(':');
            if (parts.length <= 1) {
              return h;
            }
            const name = parts.shift()!;
            h[name] = parts.join(':').trim();
            return h;
          },
          {}
        );
        const schema = await getRemoteSchema({
          endpoint,
          headers,
        });

        // Write slicknode.yml file for remote module
        const moduleConfig = {
          module: {
            id: moduleId,
            namespace,
            label,
            remote: {
              endpoint,
              ...(Object.keys(headers).length ? { headers } : {}),
            },
          },
        };
        fs.writeFileSync(
          path.join(moduleDir, 'slicknode.yml'),
          yaml.safeDump(sortKeys(moduleConfig), {
            indent: 2,
          })
        );

        // Write introspection schema to schema.graphql
        fs.writeFileSync(
          path.join(moduleDir, 'schema.graphql'),
          printSchema(schema)
        );
      } else {
        // Create module from template
        await copyTemplate(
          path.join(__dirname, '../', '../', 'templates', 'module'),
          moduleDir,
          {
            MODULE_ID: moduleId,
            MODULE_NAMESPACE: namespace,
            MODULE_LABEL: label,
          }
        );
      }

      // @TODO: Check of unique namespace

      // Add module to slicknode.yml
      const relModulePath =
        '.' +
        moduleDir
          .substr(this.getProjectRoot().length)
          .split(path.sep)
          .join('/');
      const newConfig = {
        ...config,
        dependencies: {
          ...config.dependencies,
          [moduleVariables.MODULE_ID]: relModulePath,
        },
      };
      fs.writeFileSync(
        path.join(this.getProjectRoot(), 'slicknode.yml'),
        yaml.safeDump(sortKeys(newConfig), {
          indent: 2,
        })
      );

      this.log(
        chalk.green(`
  SUCCESS! Module was created

  Add your type definitions to ${relModulePath}/schema.graphql

  Afterwards run ${chalk.bold('slicknode deploy')} to deploy the changes
  `)
      );
    } catch (e: any) {
      this.error(chalk.red('Could not create module: ' + e.message));
    }
  }
}
