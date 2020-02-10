import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  IEnvironmentConfig,
} from '../types';

import {flags} from '@oclif/command';
import {cli} from 'cli-ux';
import {BaseCommand} from '../base/base-command';

export default class DeleteCommand extends BaseCommand {
  public static description = 'Delete the current project deployment from the slicknode servers.';

  public static flags = {
    ...BaseCommand.flags,
    force: flags.boolean({
      char: 'f',
      description: 'Force the deletion without asking for confirmation',
    }),
    env: flags.string({
      char: 'e',
      description: 'The environment to delete',
    }),
  };

  public async run(): Promise<void> {
    // Check if directory is initialized
    const input = this.parse(DeleteCommand);
    const config = await this.getConfig();
    if (!config) {
      this.error(chalk.red('Delete failed:\n'), {exit: false});
      this.log(
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
    if (!input.flags.force) {
      this.warn(
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
        this.error(chalk.red('Entered project alias does not match. Aborting delete.'));
        return;
      }
    }

    // Run delete migration
    try {
      cli.action.start('Deleting project in cluster');
      const result = await this.getClient().fetch(DELETE_PROJECT_MUTATION, {id: env.id});
      cli.action.stop();
      if (result.errors && result.errors.length) {
        throw new Error(result.errors[0].message);
      }
    } catch (e) {
      this.error(chalk.red(`Error deleting project: ${e.message}`));
      return;
    }

    // Update local environment
    await this.updateEnvironment(input.flags.env || 'default', null);

    this.log(chalk.green('Project successfully deleted'));
  }

  public async getOrCreateEnvironment(): Promise<IEnvironmentConfig> {
    const input = this.parse(DeleteCommand);
    const env = await this.getEnvironment(input.flags.env || 'default');
    if (env) {
      return env;
    }

    throw new Error('Environment does not exist. Check your .slicknoderc file to see all configured environments.');
  }
}

export const DELETE_PROJECT_MUTATION = `mutation DeleteProjectMutation($id: ID!) {
  deleteProject(input: {id: $id}) {
    node {
      id
    }
  }
}
`;
