import {flags} from '@oclif/command';
import chalk from 'chalk';
import {BaseCommand} from '../base/base-command';
import {openUrl} from '../utils';

export default class ConsoleCommand extends BaseCommand {
  public static description = 'Open the Slicknode console';

  public static flags = {
    ...BaseCommand.flags,
    env: flags.string({
      char: 'e',
      description: 'The configured environment name',
    }),
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
