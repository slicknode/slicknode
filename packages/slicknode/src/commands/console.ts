import chalk from 'chalk';
import { EnvCommand } from '../base/env-command';
import { createExternalProject } from '../utils/createExternalProject';
import inquirer from 'inquirer';
import cli from 'cli-ux';

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

    // Make sure this is running in a Slicknode project root
    await this.getConfig();
    let alias: string;
    const envName: string = input.flags.env || 'default';

    // Ensure user is authenticated
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    let environment = await this.getEnvironment(envName);
    if (!environment) {
      this.log(
        'The Slicknode project is not deployed yet. Create new environment:'
      );

      const { selfHosted } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selfHosted',
          message: 'Where is the project running?',
          choices: [
            { name: 'Self-Hosted / Local', value: true },
            { name: 'Slicknode Cloud', value: false },
          ],
        },
      ]);
      if (!selfHosted) {
        this.error(
          'Please deploy the project to the Slicknode cloud first:\n\n\tslicknode deploy'
        );
      }

      const project = await createExternalProject({
        path: this.getProjectRoot(),
        command: this,
        envName,
      });
      alias = project.alias;

      // Load new environment
      environment = await this.getEnvironment(envName);
    }

    // Load console URL
    alias = environment?.alias || '';
    const client = await this.getClient();
    const result = await client.fetch(GET_CONSOLE_URL_QUERY, {
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

    cli.action.start('Opening console in browser window');
    this.openUrl(consoleUrl);
    cli.action.stop();
  }
}
