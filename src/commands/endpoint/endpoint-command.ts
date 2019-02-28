/**
 * Created by Ivo Meißner on 08.08.17.
 */

import chalk from 'chalk';
import {
  isDirectory,
} from '../../validation/options';
import {Command} from '../command';

interface IEndpointCommandOptions {
  dir?: string;
  env?: string;
}

interface IEndpointCommandArguments {}

export class EndpointCommand extends Command<IEndpointCommandOptions, IEndpointCommandArguments> {
  public static command = 'endpoint';
  public static description = 'Return the GraphQL API endpoint';
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
      this.logger.log(environment.endpoint);
    } else {
      this.logger.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
