import chalk from 'chalk';
import * as _ from 'lodash';
import { EnvCommand } from '../base/env-command';
import loadProjectVersion from '../utils/loadProjectVersion';
import { pullDependencies } from '../utils/pullDependencies';

export const LOAD_PROJECT_BUNDLE_QUERY = `
query GetProjectBundle($id: ID!) {
  registryUrl
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

    const projectRoot = this.getProjectRoot();
    const client = await this.getClient();

    // Load project version
    const env = await this.getEnvironment(input.flags.env || 'default', true);
    if (!env) {
      // Update non private modules from registry
      await pullDependencies({
        config,
        client,
        dir: projectRoot,
      });
      this.log(chalk.green('Local source was successfully updated'));
      return;
    }

    // Load project version
    const result = await client.fetch(LOAD_PROJECT_BUNDLE_QUERY, {
      id: env.id,
    });
    if (result.errors && result.errors.length) {
      this.error(`Error loading project source: ${result.errors[0].message}`);
      return;
    }

    const bundle = _.get(result, 'data.project.version.bundle');
    if (!bundle) {
      this.error(
        "The project does not exist on the Slicknode Servers or you don't have enough permissions."
      );
      return;
    }

    // Load the source from the servers
    try {
      await loadProjectVersion(projectRoot, bundle);
    } catch (e: any) {
      this.error(`Updating private modules failed: ${e.message}`, {
        exit: false,
      });
    }

    // Update non private modules from registry
    await pullDependencies({
      config,
      client,
      dir: projectRoot,
    });

    this.log(chalk.green('Local source was successfully updated'));
  }
}
