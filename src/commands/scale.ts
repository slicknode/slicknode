/**
 * Created by Ivo Meißner on 24.05.18
 *
 * @flow
 */

import chalk from 'chalk';
import {
  isDirectory,
} from '../validation/options';
import Command from './Command';

interface IScaleInput {
  active: boolean;
  project: string;
  apiMin?: number;
  apiMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
}

interface IScaleCommandOptions {
  dir?: string;
  env?: string;
  api?: string;
  runtime?: string;
}

interface IScaleCommandArguments {}

export default class ScaleCommand extends Command<IScaleCommandOptions, IScaleCommandArguments> {
  public static command = 'scale';
  public static description = 'Scale the cloud infrastructure of the project';
  public static options = [
    {
      name: '-d, --dir <path>',
      description: 'The target directory, if other than current',
      validator: isDirectory,
    },
    {
      name: '-e, --env <env>',
      description: 'The configured environment name',
    },
    {
      name: '--api <api>',
      description: (
        'The number of API instances to run in the cloud, expressed ' +
        'as a range (2-5) for automatically scaled elastic deployments or a simple number (5)' +
        'for fixed deployments.'
      ),
      validator: rangeValidator,
    },
    {
      name: '--runtime <runtime>',
      description: (
        'The number of runtime instances to run in the cloud, expressed ' +
        'as a range (2-5) for automatically scaled elastic deployments or a simple number (5)' +
        'for fixed deployments.'
      ),
      validator: rangeValidator,
    },
  ];

  public async run() {
    // Check if directory is initialized
    const config = await this.getConfig();
    if (!config) {
      return;
    }

    // Check if we have environment already
    const env = await this.getEnvironment(this.options.env || 'default');
    if (!env) {
      this.logger.error(
        'The project is not yet deployed to the servers for the environment. ' +
        `To deploy the project, run ${chalk.bold('slicknode deploy')}`,
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
    const input: IScaleInput = {
      active: true,
      project: env.id,
    };

    // Scale api
    if (this.options.api) {
      input.apiMin = parseInt(this.options.api[0], 10);
      input.apiMax = parseInt(this.options.api[1], 10);
    }

    // Scale runtime
    if (this.options.runtime) {
      input.runtimeMin = parseInt(this.options.runtime[0], 10);
      input.runtimeMax = parseInt(this.options.runtime[1], 10);
    }

    const {
      errors,
    } = await this.client.fetch(UPDATE_DEPLOYMENT_MUTATION, {input}) as {errors?: Array<{message: string}>};

    if (errors && errors.length) {
      this.logger.error('Error scaling project in slicknode cluster:');
      errors.forEach((error) => {
        this.logger.error(`  ${error.message}`);
      });
    } else {
      this.logger.log(
        chalk.green('Deployment successfully scaled! \n') +
        'The cluster will adjust the deployments in a few moments.',
      );
    }
  }
}

const UPDATE_DEPLOYMENT_MUTATION = `mutation UpdateProjectDeploymentMutation($input: updateProjectDeploymentsInput!) {
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

function rangeValidator(value: string): number[] {
  if (!value.match(/^(\d+)(-\d+)?$/)) {
    throw new Error('Invalid range value provided');
  }
  const parts = value.split('-');
  const range = [
    parseInt(parts[0], 10),
    parseInt(parts[parts.length === 1 ? 0 : 1], 10),
  ];

  if (range[0] > range[1]) {
    throw new Error('Min value cannot be smaller than max');
  }
  return range;
}
