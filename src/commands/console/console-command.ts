/**
 * Created by Ivo Meißner on 08.08.17.
 */

import chalk from 'chalk';
import {openUrl} from '../../utils';
import {
  isDirectory,
} from '../../validation/options';
import {Command} from '../command';

interface IConsoleCommandOptions {
  dir?: string;
  env?: string;
}

interface IConsoleCommandArguments {}

export class ConsoleCommand extends Command<IConsoleCommandOptions, IConsoleCommandArguments> {
  public static command = 'console';
  public static description = 'Open the Slicknode console';
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
      openUrl(environment.consoleUrl, this.logger);
    } else {
      this.logger.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
