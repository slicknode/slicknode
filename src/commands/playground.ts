import chalk from 'chalk';
import { EnvCommand } from '../base/env-command';
import * as utils from '../utils';

export const GET_PLAYGROUND_URL_QUERY = `
query Q($alias: String!) {
  project: getProjectByAlias(alias: $alias) {
    playgroundUrl
  }
}
`;

export default class PlaygroundCommand extends EnvCommand {
  public static description = 'Open the GraphQL API Playground';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    const input = this.parse(PlaygroundCommand);

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
    const result = await this.getClient().fetch(GET_PLAYGROUND_URL_QUERY, {
      alias: environment?.alias || '',
    });

    const playgroundUrl = result?.data?.project?.playgroundUrl;
    if (!playgroundUrl) {
      this.error(
        chalk.red(
          'ERROR: Could not load project playground URL. ' +
            `Make sure the project "${alias}" exists in the cloud and that you have access to it.`
        ),
        { exit: 1 }
      );
    }

    utils.openUrl(playgroundUrl);
  }
}
