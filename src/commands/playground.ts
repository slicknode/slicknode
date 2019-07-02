import chalk from 'chalk';
import {EnvCommand} from '../base/env-command';
import {openUrl} from '../utils';

export default class PlaygroundCommand extends EnvCommand {
  public static description = 'Open the GraphiQL API Playground';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    const input = this.parse(PlaygroundCommand);

    const environment = await this.getEnvironment(
      input.flags.env || 'default',
    );
    if (environment) {
      openUrl(environment.playgroundUrl);
    } else {
      this.error(chalk.red(
        'ERROR: The directory is not a valid slicknode project. ' +
        'Run this command from your project folder with an initialized project.',
      ));
    }
  }
}
