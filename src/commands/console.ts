import chalk from 'chalk';
import { EnvCommand } from '../base/env-command';
import * as utils from '../utils';

export const GET_CONSOLE_URL_QUERY = `
query Q($alias: String!) {
  project: getProjectByAlias(alias: $alias) {
    consoleUrl
  }
}
`;

export default class ConsoleCommand extends EnvCommand {
  public static description = 'Open the Slicknode console';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    const input = this.parse(ConsoleCommand);

    const environment = await this.getEnvironment(input.flags.env || 'default');

    if (!environment) {
      this.error(
        chalk.red(
          'ERROR: The directory is not a valid slicknode project. ' +
            'Run this command from your project folder with an initialized project.'
        )
      );
    }

    // Ensure user is authenticate
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Load console URL
    const alias = environment?.alias || '';
    const result = await this.getClient().fetch(GET_CONSOLE_URL_QUERY, {
      alias: environment?.alias || '',
    });

    const consoleUrl = result?.data?.project?.consoleUrl;
    if (!consoleUrl) {
      this.error(
        chalk.red(
          'ERROR: Could not load project console URL. ' +
            `Make sure the project "${alias}" exists in the cloud and that you have access to it.`
        ),
        { exit: 1 }
      );
    }

    utils.openUrl(consoleUrl);
  }
}
