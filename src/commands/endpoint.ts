import chalk from 'chalk';
import {EnvCommand} from '../base/env-command';

export class EndpointCommand extends EnvCommand {
  public static command = 'endpoint';
  public static description = 'Return the GraphQL API endpoint';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    const input = this.parse(EndpointCommand);
    const environment = await this.getEnvironment(
      input.flags.env || 'default',
    );
    if (environment) {
      this.log(environment.endpoint);
    } else {
      this.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
