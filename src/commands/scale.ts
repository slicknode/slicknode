import chalk from 'chalk';
import { EnvCommand } from '../base/env-command';
import { range } from '../flags';

interface IScaleInput {
  active: boolean;
  project: string;
  apiMin?: number;
  apiMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
}

export default class ScaleCommand extends EnvCommand {
  public static command = 'scale';
  public static description = 'Scale the cloud infrastructure of the project';

  public static flags = {
    ...EnvCommand.flags,
    api: range({
      description:
        'The number of API instances to run in the cloud, expressed ' +
        'as a range (2-5) for automatically scaled elastic deployments or a simple number (5)' +
        'for fixed deployments.',
    }),
    runtime: range({
      description:
        'The number of runtime instances to run in the cloud, expressed ' +
        'as a range (2-5) for automatically scaled elastic deployments or a simple number (5)' +
        'for fixed deployments.',
    }),
  };

  public async run() {
    const input = this.parse(ScaleCommand);
    // Check if directory is initialized
    const config = await this.getConfig();
    if (!config) {
      return;
    }

    // Check if we have environment already
    const env = await this.getEnvironment(input.flags.env || 'default');
    if (!env) {
      this.error(
        'The project is not yet deployed to the servers for the environment. ' +
          `To deploy the project, run ${chalk.bold('slicknode deploy')}`
      );
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    // Ensure user is logged in
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    // Validate data and build input values
    const queryInput: IScaleInput = {
      active: true,
      project: env.id,
    };

    // Scale api
    if (input.flags.api) {
      queryInput.apiMin = input.flags.api[0];
      queryInput.apiMax = input.flags.api[1];
    }

    // Scale runtime
    if (input.flags.runtime) {
      queryInput.runtimeMin = input.flags.runtime[0];
      queryInput.runtimeMax = input.flags.runtime[1];
    }

    const { errors } = (await this.getClient().fetch(
      UPDATE_DEPLOYMENT_MUTATION,
      { input: queryInput }
    )) as { errors?: Array<{ message: string }> };

    if (errors && errors.length) {
      this.error('Error scaling project in slicknode cluster:', {
        exit: false,
      });
      errors.forEach((error) => {
        this.error(`  ${error.message}`, { exit: false });
      });
    } else {
      this.log(
        chalk.green('Deployment successfully scaled! \n') +
          'The cluster will adjust the deployments in a few moments.'
      );
    }
  }
}

export const UPDATE_DEPLOYMENT_MUTATION = `
mutation UpdateProjectDeploymentMutation($input: updateProjectDeploymentsInput!) {
  updateProjectDeployments(input: $input) {
    deployments {
      id
      apiMin
      apiMax
      runtimeMin
      runtimeMax
      cluster {
        alias
        name
      }
    }
  }
}`;
