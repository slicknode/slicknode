/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */

import { flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as _ from 'lodash';
import { Uploadable } from '@slicknode/client-node';
import { BaseCommand } from '../base/base-command';
import {
  IEnvironmentConfig,
  IProjectChange,
  IProjectChangeError,
} from '../types';
import { packProject } from '../utils';
import validate from '../validation/validate';
import { printChanges, printErrors } from '../utils/printStatus';

export default class StatusCommand extends BaseCommand {
  public static command = 'status';
  public static description =
    'Show information about the current project status (changes, warnings etc.)';

  public static flags = {
    ...BaseCommand.flags,
    env: flags.string({
      char: 'e',
      description: 'The configured environment name',
    }),
  };

  public async run() {
    // Check if directory is initialized
    const config = await this.getConfig();
    const input = this.parse(StatusCommand);
    if (!config) {
      return;
    }
    const errors = await validate(this.getProjectRoot(), config);

    if (errors.length) {
      this.error(chalk.red('Project configuration has errors: \n'), {
        exit: false,
      });
      errors.forEach((error, index) => {
        this.error(chalk.red(`  ${index + 1}. ${error.toString()}\n`), {
          exit: false,
        });
      });
      this.error('Abort');
    }

    // Check if we have environment already
    const env = await this.getEnvironment(input.flags.env || 'default');
    if (!env) {
      this.log(
        'No errors found but project is not deployed in this environment. ' +
          `To deploy the project, run ${chalk.bold('slicknode deploy')}`
      );
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    // Ensure user is logged in
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    const statusValid = await this.loadAndPrintStatus(env);
    if (!statusValid) {
      return;
    }

    this.log(
      `  Run ${chalk.bold(
        'slicknode deploy'
      )} to deploy the changes to the server\n`
    );
  }

  /**
   * Loads and prints the status
   * Returns true if project has a valid status and no errors
   *
   * @param env
   * @returns {Promise.<boolean>}
   */
  public async loadAndPrintStatus(env: IEnvironmentConfig): Promise<boolean> {
    // Run dummy migration
    cli.action.start('Comparing local changes with cluster state');
    const result = await this.migrateProject(true, env);
    cli.action.stop();

    if (result.data === null || _.get(result, 'errors[0].message')) {
      this.error(
        `Error loading state from API: ${_.get(result, 'errors[0].message')}`
      );
    }

    const serverErrors = _.get(result, 'data.migrateProject.errors', []).filter(
      (e: IProjectChangeError | null) => e
    );
    if (serverErrors.length) {
      printErrors(serverErrors, this.log);
      return false;
    }

    printChanges(
      _.get(result, 'data.migrateProject.changes', []).filter(
        (e: IProjectChangeError | null) => e
      ),
      this.log
    );
    return true;
  }

  public async migrateProject(
    dryRun: boolean,
    env: IEnvironmentConfig
  ): Promise<any> {
    // Run server side validation and get status
    const zip = await packProject(this.getProjectRoot());

    // Convert zip to buffer
    const file = (await new Promise((resolve, reject) => {
      zip.toBuffer(resolve, reject);
    })) as Uploadable;

    // zip.writeZip(target);
    const client = await this.getClient();
    return await client.fetch(
      MIGRATE_PROJECT_MUTATION,
      {
        input: {
          id: env.id,
          dryRun,
        },
      },
      null,
      {
        file,
      }
    );
  }
}

export const MIGRATE_PROJECT_MUTATION = `mutation MigrateProjectMutation(
  $input: migrateProjectInput!
) {
  migrateProject(input: $input) {
    node {
      id
      name
      alias
      version {
        id
        bundle
      }
    }
    errors {
      description
      path
      module
    }
    changes {
      description
      path
      module
      type
    }
  }
}`;
