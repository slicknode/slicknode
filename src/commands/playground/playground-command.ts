/**
 * Created by Ivo Meißner on 08.08.17.
 *
 * @flow
 */

import chalk from 'chalk';
import {openUrl} from '../../utils/index';
import {
  isDirectory,
} from '../../validation/options';
import {Command} from '../command';

interface IPullCommandOptions {
  dir?: string;
  env?: string;
}

interface IPullCommandArguments {}

export class PlaygroundCommand extends Command<IPullCommandOptions, IPullCommandArguments> {
  public static command = 'playground';
  public static description = 'Open the GraphiQL API Playground';
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
    const environment = await this.getEnvironment(
      this.options.env || 'default',
    );
    if (environment) {
      openUrl(environment.playgroundUrl, this.logger);
    } else {
      this.logger.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
