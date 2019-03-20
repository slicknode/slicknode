/**
 * Created by Ivo Meißner on 08.08.17.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  IEnvironmentConfig,
} from '../../types';
import {
  isDirectory,
} from '../../validation/options';

import {Command} from '../command';

interface IDeleteCommandOptions {
  dir?: string;
  env?: string;
  force?: boolean;
}

interface IDeleteCommandArguments {}

export class DeleteCommand extends Command<IDeleteCommandOptions, IDeleteCommandArguments> {
  public static command = 'delete';
  public static description = 'Delete the current project deployment from the slicknode servers.';
  public static options = [
    {
      name: '-d, --dir <path>',
      description: 'The target directory, if other than current',
      validator: isDirectory,
    },
    {
      name: '-e, --env <env>',
      description: 'The configured environment name',
    },
    {
      name: '-f, --force <force>',
      description: 'Forces the delete without asking for confirmation',
    },
  ];

  public async run(): Promise<void> {
    // Check if directory is initialized
    const config = await this.getConfig();
    if (!config) {
      this.logger.error(chalk.red('Delete failed:\n'));
      this.logger.log(
        '  The directory is not a slicknode project.',
      );
      return;
    }

    // Ensure user is authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Run migration migration
    const env = await this.getOrCreateEnvironment();

    // Confirm changes
    if (!this.options.force) {
      this.logger.warn(
        chalk.red('WARNING: You are about to delete the project with all its data. \n' +
        `All data will be lost and can NOT be recovered! Type the project alias "${env.alias}" ` +
        'to confirm the operation.'),
      );
      const values = await inquirer.prompt([
        {
          name: 'alias',
          type: 'input',
          message: 'Project alias:',
        },
      ]) as {alias: string};

      if (values.alias !== env.alias) {
        this.logger.error(chalk.red('Entered project alias does not match. Aborting delete.'));
        return;
      }
    }

    // Run delete migration
    try {
      await this.client.fetch(deleteMutation, {id: env.id});
    } catch (e) {
      this.logger.error(chalk.red(`Error deleting project: ${e.message}`));
      return;
    }

    // Update local environment
    await this.updateEnvironment(this.options.env || 'default', null);

    this.logger.log(chalk.green('Project successfully deleted'));
  }

  public async getOrCreateEnvironment(): Promise<IEnvironmentConfig> {
    const env = await this.getEnvironment(this.options.env || 'default');
    if (env) {
      return env;
    }

    throw new Error('Environment does not exist. Check your .slicknoderc file to see all configured environments.');
  }
}

const deleteMutation = `mutation DeleteProjectMutation($id: ID!) {
  deleteProject(input: {id: $id}) {
    clientMutationId
  }
}
`;
