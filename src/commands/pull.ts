/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */

import {
  isDirectory,
} from '../validation/options';

import Command from './Command';

interface IPullCommandOptions {
  dir?: string;
  env?: string;
}

interface IPullCommandArguments {}

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

    this.logger.log('Running pull');
  }
}
