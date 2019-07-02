import chalk from 'chalk';
import {EnvCommand} from '../base/env-command';
import {openUrl} from '../utils';

export default class ConsoleCommand extends EnvCommand {
  public static description = 'Open the Slicknode console';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    const input = this.parse(ConsoleCommand);

    const environment = await this.getEnvironment(
      input.flags.env || 'default',
    );
    if (environment) {
      openUrl(environment.consoleUrl);
    } else {
      this.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
