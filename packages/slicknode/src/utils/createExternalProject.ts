import { BaseCommand } from '../base/base-command';
import dotenv from 'dotenv';
import path from 'path';
import { randomName, randomString } from './string';
import inquirer from 'inquirer';
import * as uuid from 'uuid';
import { getAccounts } from './getAccounts';
import fs from 'fs-extra';
import cli from 'cli-ux';

// Exported only so we can use it in tests
export const CREATE_PROJECT_MUTATION = `
mutation CreateProjectMutation(
  $input: createProjectInput!
) {
  createProject(input: $input) {
    node {
      id
    }
  }
}
`;

/**
 * Creates a new remote project in the Slicknode console
 * @param params
 */
export async function createExternalProject(params: {
  // Path to slicknode project root
  path: string;

  // Base command
  command: BaseCommand;

  // The environment name
  envName: string;
}) {
  const { command, envName } = params;

  // Load
  dotenv.config({
    path: path.resolve(params.path, '.env'),
  });

  let suggestedName = randomName();
  if (envName !== 'default') {
    const defaultEnv = await command.getEnvironment('default', true);
    if (defaultEnv) {
      suggestedName = `${defaultEnv.name} (${envName})`;
    }
  }
  const valuePrompts = [];
  valuePrompts.push({
    name: 'name',
    type: 'input',
    default: suggestedName,
    message: 'Project name (as displayed in console):',
    validate: (value: any) => {
      return value && String(value).length > 1 && String(value).length < 64;
    },
  });
  const client = await command.getClient();

  cli.action.start('Loading accounts');
  const accounts = await getAccounts({ client, command });
  cli.action.stop();
  let account: string;
  if (accounts.length === 0) {
    return command.error(
      'You do not have any active Slicknode accounts. Go to slicknode.com to create one.'
    );
  } else if (accounts.length === 1) {
    // We only have one account, no need to ask
    account = accounts[0].identifier;
  } else {
    valuePrompts.push({
      name: 'account',
      type: 'list',
      message: 'Select account:',
      choices: accounts.map((account) => ({
        name: account.name,
        value: account.identifier,
      })),
    });
  }

  valuePrompts.push({
    name: 'externalEndpoint',
    message: 'HTTP endpoint to the GraphQL API:',
    default: `http://localhost:${process.env.SLICKNODE_PORT || 3000}`,
    type: 'input',
  });

  // Check if admin secret is set
  let adminSecret = process.env.SLICKNODE_ADMIN_SECRET;
  const defaultAdminSecret = randomString(48);

  if (!adminSecret) {
    valuePrompts.push({
      name: 'adminSecret',
      type: 'password',
      message: 'Admin Secret (empty to generate one):',
      default: defaultAdminSecret,
      mask: '*',
      validate: (value: any) => {
        if (String(value).length >= 20) {
          return true;
        }
        return 'Admin secret has to have at least 20 characters';
      },
    });
  }

  const values = {
    adminSecret,
    ...((await inquirer.prompt(valuePrompts)) as {
      name: string;
      account?: string;
      adminSecret?: string;
      externalEndpoint: string;
    }),
  };

  const alias =
    values.name
      .toLowerCase()
      .split(' ')
      .join('-')
      .replace(/[^\w-]/gi, '') +
    '-' +
    uuid.v4().substr(0, 8);
  account = values.account ? values.account : account!;

  cli.action.start(`Adding project to console (Account: "${account}")`);
  const result = await client.fetch(CREATE_PROJECT_MUTATION, {
    input: {
      ...values,
      alias,
    },
  });
  if (result.errors) {
    command.error(`Error creating project: ${result.errors[0].message}`);
  }

  // Write admin secret to .env file if generated
  if (defaultAdminSecret === values.adminSecret) {
    cli.action.start('Adding generated SLICKNODE_ADMIN_SECRET to .env file');
    await fs.appendFile(
      path.join(params.path, '.env'),
      `\nSLICKNODE_ADMIN_SECRET=${values.adminSecret}\n`
    );
    cli.action.stop();
  }

  // Add environment to project
  const environmentConfig = {
    alias,
    endpoint: values.externalEndpoint,
    name: values.name,
    id: result.data?.createProject?.node?.id,
  };
  cli.action.start(`Adding environment "${envName}" to .slicknoderc`);
  await command.updateEnvironment(envName, environmentConfig, params.path);
  cli.action.stop();

  return {
    ...values,
    alias,
  };
}
