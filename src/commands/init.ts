import { flags } from '@oclif/command';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import cli from 'cli-ux';
import fs, { mkdirpSync, pathExists, readdir } from 'fs-extra';
import _ from 'lodash';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import { Uploadable } from 'slicknode-client';
import * as uuid from 'uuid';
import validator from 'validator';
import { BaseCommand } from '../base/base-command';

import { execSync } from 'child_process';
import { packProject, randomName } from '../utils';
import { getCluster } from '../utils/getCluster';
import { importGitRepository } from '../utils/importGitRepository';
import { waitForEndpoint } from '../utils/waitForEndpoint';

export const LIST_CLUSTER_QUERY = `query {
  listCluster(first: 100, filter: {node: {openForProjects: true}}) {
    edges {
      node {
        id
        alias
        name
        pingUrl
      }
    }
  }
}`;

export const CREATE_PROJECT_MUTATION = `mutation CreateProject($input: createProjectInput!) {
  createProject(input: $input) {
    node {
      id
      alias
      name
      endpoint
      version {
        bundle
        id
      }
    }
  }
}`;

export default class InitCommand extends BaseCommand {
  public static description = 'Create a new Slicknode project';
  public static args = [
    {
      name: 'name',
      description: 'The name of the project',
    },
    {
      name: 'template',
      description: 'Git repository URL to be used as template',
      parse: (value: string) => {
        if (
          !validator.isURL(value, {
            protocols: ['http', 'https', 'ssh', 'git'],
          })
        ) {
          throw new Error(
            `The template URL is invalid or has an unsupported format: "${value}". Please provide a public Git URL`
          );
        }
        return value;
      },
    },
  ];

  public static flags = {
    ...BaseCommand.flags,
    name: flags.string({
      char: 'n',
      description: 'The name of the project as displayed in the console',
    }),
    alias: flags.string({
      char: 'a',
      description: 'The alias of the project which is part of the endpoint URL',
    }),
    account: flags.string({
      description:
        'The identifier of the account where the project should be deployed',
    }),
  };

  public async run() {
    // Check if directory is already initialized
    const env = await this.getEnvironment('default', true);
    if (env) {
      this.error('The directory is already initialized as a slicknode project');
      return;
    }

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    // Ensure authentication
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    const input = this.parse(InitCommand);
    let { alias } = input.flags;
    let { name } = input.args;
    const { template } = input.args;

    // Get name from flag if it was not set via arg
    if (!name) {
      name = input.flags.name || null;
    }

    const account = input.flags.account || null;

    // Create directory if name was provided via args and directory does not exist
    let targetDir = this.getProjectRoot();

    // // Check if dir was explicitly set
    const dirExplicitlySet = input.raw.some((token) => {
      return ['--dir', '-d'].includes(token.input);
    });
    if (name && !dirExplicitlySet) {
      try {
        targetDir = path.join(path.resolve(''), name);
        mkdirpSync(targetDir);
      } catch (e) {
        this.error(
          `ERROR: Failed to create project directory ${targetDir}. ${e.message}`
        );
      }

      // Ensure directory is empty
      const content = await readdir(targetDir);
      if (content.length > 0) {
        this.error(
          'The directory already exists and is not empty. ' +
            `Delete the content or initialize the project in a different directory: ${targetDir}`,
          { exit: 1 }
        );
      }
    }

    if (!name) {
      name = name ? name : randomName();
    }
    // Generate name and alias
    if (!alias) {
      alias = name.toLowerCase() + '-' + uuid.v4().substr(0, 8);
    }

    // Load template for new project
    let file: Uploadable | null = null;
    if (template) {
      try {
        cli.action.start(`Loading project template "${template}"`);
        await importGitRepository({
          repository: template,
          targetDir,
        });

        // Run validation and get status
        const zip = await packProject(targetDir);

        // Convert zip to buffer
        file = (await new Promise((resolve, reject) => {
          zip.toBuffer(resolve, reject);
        })) as Uploadable;
        cli.action.stop();

        // Install node modules if we have package.json
        if (await pathExists(path.join(targetDir, 'package.json'))) {
          cli.action.start('Installing node dependencies');
          const npmInstallResult = execSync('npm install', {
            cwd: targetDir,
            encoding: 'utf8',
            stdio: 'inherit',
          });
          cli.action.stop();
          if (npmInstallResult) {
            this.log(npmInstallResult);
          }
        }
      } catch (e) {
        this.error(`Error loading project template: ${e.message}`);
        return;
      }
    }

    const cluster = await getCluster({
      client: this.getClient(),
    });
    if (!cluster) {
      this.error(
        'Could not load available clusters. Make sure you have a working internet connection and try again.'
      );
      return;
    }

    cli.action.start('Deploying project to cluster');
    const variables = {
      input: {
        name,
        alias,
        cluster: cluster.id,
        account,
      },
    };
    const client = this.getClient();
    const result = await client.fetch(
      CREATE_PROJECT_MUTATION,
      variables,
      null,
      file ? { file } : undefined
    );
    cli.action.stop();

    // Load bundle
    try {
      cli.action.start('Update local files');
      const project = _.get(result, 'data.createProject.node');
      if (!project) {
        const messages = [
          'ERROR: Could not create project. Please try again later.',
        ];
        if (result.errors && result.errors.length) {
          result.errors.forEach((err) => messages.push(err.message));
        }
        this.error(messages.join('\n'));
        return;
      }
      const bundle = _.get(project, 'version.bundle');
      if (!bundle) {
        this.error(
          'Project was created but could not be fully initialized, possibly because of no available capacity. ' +
            'Try to clone the project later.'
        );
        return;
      }
      const response = await fetch(project.version.bundle);

      const tmpFile = path.join(os.tmpdir(), project.version.id + '.zip');
      try {
        fs.writeFileSync(tmpFile, await response.buffer());
      } catch (e) {
        this.error(
          chalk.red(
            'Could not write bundle to disk: \n' + 'Message: ' + e.message
          )
        );
        return;
      }

      // Unzip all module data to slicknode cache dir
      const zip = new AdmZip(tmpFile);
      const moduleCacheDir = path.join(targetDir, '.slicknode', 'cache');
      mkdirpSync(moduleCacheDir);
      zip.extractAllTo(moduleCacheDir, true);

      // Create slicknode.yml if not installed from template
      if (!template) {
        zip.extractEntryTo('slicknode.yml', targetDir);
      }

      // Update environment
      await this.updateEnvironment(
        'default',
        {
          endpoint: project.endpoint,
          version: project.version.id,
          alias: project.alias,
          name: project.name,
          id: project.id,
        },
        targetDir
      );

      // Add cachefiles to gitignore
      const gitIgnore = path.join(targetDir, '.gitignore');
      fs.appendFileSync(
        gitIgnore,
        '# Slicknode cache data\n.slicknode\n\n',
        'utf8'
      );

      try {
        // Cleanup
        fs.unlink(tmpFile);
      } catch (e) {
        this.log(chalk.red('Temporary file was not deleted: ' + e.message));
      }

      // Copy config
      await fs.copy(
        path.join(moduleCacheDir, 'slicknode.yml'),
        path.join(targetDir, 'slicknode.yml')
      );

      // Wait for API to become available
      try {
        cli.action.start('Waiting for API to launch');
        await waitForEndpoint(project.endpoint);
        cli.action.stop();
      } catch (e) {
        cli.action.stop('failed');
        this.warn(
          'The project was created but the API is not reachable from your machine yet. ' +
            'Check your internet connection and open the project in the console in a few minutes.'
        );
      }

      this.log(
        chalk.green(
          '\n\nYour GraphQL Server is ready: \n\n' +
            '    ' +
            chalk.bold('Endpoint: ') +
            chalk.bold(project.endpoint) +
            '\n' +
            '    ' +
            chalk.bold('Name: ') +
            chalk.bold(project.name)
        )
      );
      this.log(`
Start exploring now...
- Open console: ${chalk.bold('slicknode console')}
- Open playground: ${chalk.bold('slicknode playground')}

Find more help in the documentation: http://slicknode.com
`);
    } catch (e) {
      this.error(`Initialization failed: ${e.message}`);
    }
  }
}
