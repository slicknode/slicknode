/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */

import {flags} from '@oclif/command';
import chalk from 'chalk';
import _ from 'lodash';
import {Uploadable} from 'slicknode-client';
import {BaseCommand} from '../base/base-command';
import {
  IEnvironmentConfig,
  IProjectChange,
  IProjectChangeError,
} from '../types';
import {
  packProject,
} from '../utils';
import validate from '../validation/validate';

export default class StatusCommand extends BaseCommand {
  public static command = 'status';
  public static description = 'Show information about the current project status (changes, warnings etc.)';

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
      this.log(chalk.red('Project configuration has errors: \n'));
      errors.forEach((error, index) => {
        this.log(chalk.red(`  ${index + 1}. ${error.toString()}\n`));
      });
      this.error('Aborted');
      return;
    }

    // Check if we have environment already
    const env = await this.getEnvironment(input.flags.env || 'default');
    if (!env) {
      this.log(
        'No errors found but project is not deployed in this environment. ' +
        `To deploy the project, run ${chalk.bold('slicknode deploy')}`,
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

    this.log(`  Run ${chalk.bold('slicknode deploy')} to deploy the changes to the server\n`);
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
    const result = await this.migrateProject(true, env);

    if (result.data === null) {
      this.error(`Error loading state from API: ${_.get(result, 'errors[0].message')}`);
    }

    const serverErrors = _.get(result, 'data.migrateProject.errors', []).filter(
      (e: IProjectChangeError | null) => e,
    );
    if (serverErrors.length) {
      this.printErrors(serverErrors);
      return false;
    }

    this.printChanges(_.get(result, 'data.migrateProject.changes', []).filter(
      (e: IProjectChangeError | null) => e,
    ));
    return true;
  }

  public printErrors(errors: IProjectChangeError[]) {
    if (errors.length) {
      this.log(chalk.red(`\nThe project has ${errors.length} error${errors.length === 1 ? '' : 's'}:`));
      errors.forEach((error, index) => {
        this.log('  ' + chalk.red(`${index + 1}. ${error.description}`));
      });
      this.log('');
    }
  }

  public printChanges(changes: IProjectChange[]) {
    if (changes.length) {
      const sortedChanges = _.sortBy(changes, (change) => change.type + ':' + (change.path || []).join('.'));

      this.log(`${changes.length} pending change${changes.length === 1 ? '' : 's'}:`);
      sortedChanges.forEach((change, index) => {
        switch (change.type) {
          case 'ADD': {
            this.log('  ' + chalk.green(`add:    ${change.description}`));
            break;
          }
          case 'REMOVE': {
            this.log('  ' + chalk.red(`remove:  ${change.description}`));
            break;
          }
          case 'UPDATE': {
            this.log('  ' + chalk.yellow(`update:  ${change.description}`));
            break;
          }
          default: {
            this.log('  ' + `${index + 1}. ${change.description}`);
            break;
          }
        }
      });
    } else {
      this.log('No changes detected in project.');
    }
  }

  public async migrateProject(dryRun: boolean, env: IEnvironmentConfig): Promise<any> {

    // Run server side validation and get status
    const zip = await packProject(this.getProjectRoot());

    // Convert zip to buffer
    const file = await new Promise((resolve, reject) => {
      zip.toBuffer(resolve, reject);
    }) as Uploadable;

    // zip.writeZip(target);
    return await this.getClient().fetch(MIGRATE_PROJECT_MUTATION,
      {
        input: {
          id: env.id,
          dryRun,
        },
      },
      null,
      {
        file,
      },
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
