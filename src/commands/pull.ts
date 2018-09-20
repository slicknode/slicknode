/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */

import {
  isDirectory,
} from '../validation/options';

import chalk from 'chalk';
import _ from 'lodash';
import loadProjectVersion from '../utils/loadProjectVersion';
import Command from './Command';

interface IPullCommandOptions {
  dir?: string;
  env?: string;
}

interface IPullCommandArguments {}

const loadProjectBundleQuery = `
query GetProjectBundle($id: ID!) {
  project: getProjectById(id: $id) {
    version {
      id
      bundle
    }
  }
}
`;

export default class PullCommand extends Command<IPullCommandOptions, IPullCommandArguments> {
  public static command = 'pull';
  public static description = 'Pull the latest changes from the server';
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
  ];

  public async run() {
    // Check if directory is initialized
    const config = this.getConfig();
    if (!config) {
      return;
    }

    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    this.logger.log('Loading current version from the servers');

    // Load project version
    const env = await this.getEnvironment(this.options.env || 'default');
    if (!env) {
      return;
    }

    // Load project version
    const result = await this.client.fetch(loadProjectBundleQuery, {
      id: env.id,
    });
    if (result.errors && result.errors.length) {
      this.logger.error(`Error loading project source: ${result.errors[0].message}`);
      return;
    }

    const bundle = _.get(result, 'data.project.version.bundle');
    if (!bundle) {
      this.logger.error(
        'The project does not exist on the Slicknode Servers or you don\'t have enough permissions.',
      );
      return;
    }

    // Load the source from the servers
    await loadProjectVersion(this.getProjectRoot(), bundle);

    this.logger.info(chalk.green('Local source was successfully updated'));
  }
}
