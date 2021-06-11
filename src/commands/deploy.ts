/**
 * Created by Ivo Meißner on 08.08.17.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import { ICluster, IEnvironmentConfig, IProjectChangeError } from '../types';
import { loadProjectVersion, randomName } from '../utils';
import validate from '../validation/validate';
import StatusCommand from './status';

import { flags } from '@oclif/command';
import cli from 'cli-ux';
import _ from 'lodash';
import fetch from 'node-fetch';
import * as uuid from 'uuid';
import * as parsers from '../parsers';
import { getCluster } from '../utils/getCluster';
import { isDependencyTreeLoaded } from '../utils/isDependencyTreeLoaded';
import { pullDependencies } from '../utils/pullDependencies';
import { waitForEndpoint } from '../utils/waitForEndpoint';
import { PROJECT_ALIAS_REGEX } from '../validation';
import { CREATE_PROJECT_MUTATION, LIST_CLUSTER_QUERY } from './init';

interface IChangeCounts {
  update: number;
  add: number;
  remove: number;
}

export default class DeployCommand extends StatusCommand {
  public static command = 'deploy';
  public static description =
    'Deploy the current project state to the slicknode servers';

  public static flags = {
    ...StatusCommand.flags,
    name: flags.string({
      char: 'n',
      description: 'The name of the project as displayed in the console',
      required: false,
    }),
    force: flags.boolean({
      char: 'f',
      description: 'Force the deployment without asking for confirmation',
    }),
    account: flags.string({
      char: 'a',
      description:
        'The account identifier where the project should be deployed',
      required: false,
    }),
    alias: flags.string({
      description: 'The alias of the project which is part of the endpoint URL',
    }),
  };

  public async run(): Promise<void> {
    // Check if directory is initialized
    const config = await this.getConfig();
    const input = this.parse(DeployCommand);
    const projectRoot = this.getProjectRoot();
    const client = this.getClient();

    if (!config) {
      this.log(chalk.red('Deployment failed:\n'));
      this.error(
        '  The directory is not a slicknode project. \n' +
          `  Run ${chalk.bold('slicknode init')} to initialize a new project.`
      );
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    // Ensure user is authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Pull dependencies if not installed
    if (!(await isDependencyTreeLoaded({ dir: projectRoot, config }))) {
      await pullDependencies({
        client,
        dir: projectRoot,
        config,
      });
    }

    const errors = await validate(projectRoot, config);

    if (errors.length) {
      this.log(chalk.red('Project configuration has errors: \n'));
      errors.forEach((error, index) => {
        this.error(chalk.red(`  ${index + 1}. ${error.toString()}\n`), {
          exit: false,
        });
      });
      this.error(chalk.red('Deployment aborted'));
      return;
    }

    // Run migration
    const env = await this.getOrCreateEnvironment();
    // cli.action.start('Validating project status');
    const validStatus = await this.loadAndPrintStatus(env);
    // cli.action.stop();

    // Check if we have valid status
    if (!validStatus) {
      return;
    }

    // Confirm changes
    if (!input.flags.force) {
      const values = (await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: 'Do you want to deploy the changes?',
          default: false,
        },
      ])) as { confirm: boolean };
      if (!values.confirm) {
        this.log('Deployment aborted');
        return;
      }
    }

    cli.action.start('Deploying changes');
    const result = await this.migrateProject(false, await env);
    cli.action.stop();

    const serverErrors = _.get(result, 'data.migrateProject.errors', []).filter(
      (e: IProjectChangeError) => e
    );
    if (serverErrors.length) {
      this.printErrors(serverErrors);
      return;
    }

    const project = _.get(result, 'data.migrateProject.node');
    if (!project || !project.version || !project.version.bundle) {
      this.log(chalk.red('The version was not deployed. Try again later.'));
      _.get(result, 'errors', []).forEach((error: { message: string }) => {
        this.log(chalk.red(`Error: ${error.message}`));
      });
      return;
    }

    // Load project files from server
    cli.action.start('Updating local source files');
    try {
      await loadProjectVersion(this.getProjectRoot(), project.version.bundle);
    } catch (e) {
      this.error('Error loading project config from servers');
      return;
    }
    cli.action.stop();

    // Update environment

    // Create deployment summary
    const changes = _.get(result, 'data.migrateProject.changes', []).reduce(
      (
        changeCounts: IChangeCounts,
        change: { type: { toLowerCase: () => 'add' | 'update' | 'remove' } }
      ) => {
        changeCounts[change.type.toLowerCase()] += 1;
        return changeCounts;
      },
      { update: 0, add: 0, remove: 0 }
    );
    this.log(
      'Changes deployed to the slicknode servers: \n' +
        `${changes.add} addition${changes.add === 1 ? 's' : ''}, ` +
        `${changes.update} update${changes.update === 1 ? 's' : ''}, ` +
        `${changes.remove} removal${changes.remove === 1 ? 's' : ''}`
    );
    this.log(chalk.green('Deployment successful!'));
  }

  public async getOrCreateEnvironment(): Promise<IEnvironmentConfig> {
    const input = this.parse(DeployCommand);
    const name = input.flags.env || 'default';
    const env = await this.getEnvironment(name);
    if (env) {
      return env;
    }
    const client = this.getClient();

    // We don't have project for this env yet, create one...
    this.log(`Creating project for env "${name}"`);

    let suggestedName = randomName();
    let suggestedAlias =
      suggestedName.toLowerCase() + '-' + uuid.v4().substr(0, 8);

    let newName;
    let newAlias;

    // We don't have new name, show prompt
    const defaultEnv = await this.getEnvironment('default');
    if (defaultEnv) {
      suggestedName = input.flags.name || `${defaultEnv.name} (${name})`;
      suggestedAlias = input.flags.alias || `${defaultEnv.alias}-${name}`;
    }
    if (input.flags.force) {
      newName = suggestedName;
      newAlias = suggestedAlias;
    } else {
      const valuePrompts = [];

      if (!input.flags.name) {
        valuePrompts.push({
          name: 'name',
          type: 'input',
          default: suggestedName,
          message: 'Project name (as displayed in console):',
          validate: (value: any) => {
            return value && String(value).length > 1;
          },
        });
      }
      if (!input.flags.alias) {
        valuePrompts.push({
          name: 'alias',
          type: 'input',
          message: 'Project alias:',
          default: suggestedAlias,
          validate: (value: any) => {
            if (String(value).match(PROJECT_ALIAS_REGEX)) {
              return true;
            }
            return 'Project alias contains invalid characters';
          },
        });
      }
      const values = {
        name: suggestedName,
        alias: suggestedAlias,
        ...((await inquirer.prompt(valuePrompts)) as {
          alias?: string;
          name?: string;
        }),
      };

      newAlias = values.alias;
      newName = values.name;
    }

    // Determine data center
    const cluster = await getCluster({
      client,
    });
    if (!cluster) {
      this.error(
        chalk.red(
          'There is currently no cluster with sufficient capacity available. Try again later.'
        )
      );
      throw new Error('Error creating project');
    }

    const variables = {
      input: {
        name: newName,
        alias: newAlias,
        cluster: cluster.id,
        account: input.flags.account || null,
      },
    };

    cli.action.start('Create project in cluster');
    const result = await client.fetch(CREATE_PROJECT_MUTATION, variables);
    cli.action.stop();
    const project = _.get(result, 'data.createProject.node');
    if (!project) {
      this.log(
        chalk.red('ERROR: Could not create project. Please try again later.')
      );
      if (result.errors && result.errors.length) {
        result.errors.forEach((err) => this.log(chalk.red(err.message)));
      }
      throw new Error('Error creating project');
    }

    // Update environment
    const envConfig = {
      endpoint: project.endpoint,
      version: project.version.id,
      alias: project.alias,
      name: project.name,
      id: project.id,
    };
    await this.updateEnvironment(name, envConfig);

    // Wait for API to become available
    try {
      cli.action.start('Waiting for API to launch');
      await waitForEndpoint(project.endpoint);
      cli.action.stop();
    } catch (e) {
      cli.action.stop('failed');
      this.warn(
        'The project was created but the API is not reachable from your machine yet. ' +
          'Check your internet connection and open the project in the console in a few minutes.'
      );
    }

    return envConfig;
  }
}
