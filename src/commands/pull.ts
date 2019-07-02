import chalk from 'chalk';
import _ from 'lodash';
import {EnvCommand} from '../base/env-command';
import loadProjectVersion from '../utils/loadProjectVersion';

export const LOAD_PROJECT_BUNDLE_QUERY = `
query GetProjectBundle($id: ID!) {
  project: getProjectById(id: $id) {
    version {
      id
      bundle
    }
  }
}
`;

export default class PullCommand extends EnvCommand {
  public static description = 'Pull the latest changes from the server';

  public static flags = {
    ...EnvCommand.flags,
  };

  public async run() {
    // Check if directory is initialized
    const config = await this.getConfig();
    const input = this.parse(EnvCommand);
    if (!config) {
      return;
    }

    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    this.log('Loading current version from the servers');

    // Load project version
    const env = await this.getEnvironment(input.flags.env || 'default');
    if (!env) {
      return;
    }

    // Load project version
    const result = await this.getClient().fetch(LOAD_PROJECT_BUNDLE_QUERY, {
      id: env.id,
    });
    if (result.errors && result.errors.length) {
      this.error(`Error loading project source: ${result.errors[0].message}`);
      return;
    }

    const bundle = _.get(result, 'data.project.version.bundle');
    if (!bundle) {
      this.error(
        'The project does not exist on the Slicknode Servers or you don\'t have enough permissions.',
      );
      return;
    }

    // Load the source from the servers
    await loadProjectVersion(this.getProjectRoot(), bundle);

    this.log(chalk.green('Local source was successfully updated'));
  }
}
