import {flags} from '@oclif/command';
import AdmZip from 'adm-zip';
import chalk from 'chalk';
import cli from 'cli-ux';
import fs from 'fs-extra';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import uuid from 'uuid';
import {BaseCommand} from '../base/base-command';
import {directory} from '../parsers';
import {ICluster} from '../types';
import {
  randomName,
} from '../utils';

export const LIST_CLUSTER_QUERY = `query {
  listCluster(first: 100) {
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
      consoleUrl
      playgroundUrl
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
      description: 'The identifier of the account where the project should be deployed',
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
    let {name, alias} = input.flags;
    const {dir} = input.flags;
    const account = input.flags.account || null;

    // Create directory if name was provided via args and directory does not exist
    this.log(dir);
    let targetDir = this.getProjectRoot();
    if (name && !dir) {
      try {
        targetDir = path.join(path.resolve(''), name);
        mkdirp.sync(targetDir);
      } catch (e) {
        this.error(`ERROR: Failed to create project directory ${targetDir}. ${e.message}`);
      }
    }

    if (!name) {
      name = name ? name : randomName();
    }
    // Generate name and alias
    if (!alias) {
      alias = name.toLowerCase() + '-' + uuid.v4().substr(0, 8);
    }

    const cluster = await this.getCluster();
    if (!cluster) {
      this.error(
        'Could not load available clusters. Make sure you have a working internet connection and try again.',
      );
      return;
    }

    this.log(`Creating project ${name}`);
    const variables = {
      input: {
        name,
        alias,
        cluster: cluster.id,
        account,
      },
    };
    const client = this.getClient();
    const result = await client.fetch(CREATE_PROJECT_MUTATION, variables);

    // Load bundle
    try {
      const project = _.get(result, 'data.createProject.node');
      if (!project) {
        const messages = [
          'ERROR: Could not create project. Please try again later.',
        ];
        if (result.errors && result.errors.length) {
          result.errors.forEach(
            (err) => messages.push(
              err.message,
            ),
          );
        }
        this.error(messages.join('\n'));
        return;
      }
      const bundle = _.get(project, 'version.bundle');
      if (!bundle) {
        this.error(
          'Project was created but could not be fully initialized, possibly because of no available capacity. ' +
          'Try to clone the project later.',
        );
        return;
      }
      const response = await fetch(project.version.bundle);

      const tmpFile = path.join(os.tmpdir(), project.version.id + '.zip');
      try {
        fs.writeFileSync(tmpFile, await response.buffer());
      } catch (e) {
        this.error(chalk.red(
          'Could not write bundle to disk: \n' +
          'Message: ' + e.message,
        ));
        return;
      }

      // Unzip all module data to slicknode cache dir
      const zip = new AdmZip(tmpFile);
      const moduleCacheDir = path.join(targetDir, '.slicknode', 'cache');
      mkdirp.sync(moduleCacheDir);
      zip.extractAllTo(moduleCacheDir, true);

      zip.extractEntryTo('slicknode.yml', targetDir);

      // Update environment
      await this.updateEnvironment('default', {
        endpoint: project.endpoint,
        version: project.version.id,
        alias: project.alias,
        consoleUrl: project.consoleUrl,
        playgroundUrl: project.playgroundUrl,
        name: project.name,
        id: project.id,
      }, targetDir);

      // Add cachefiles to gitignore
      const gitIgnore = path.join(targetDir, '.gitignore');
      fs.appendFileSync(gitIgnore, '# Slicknode cache data\n.slicknode\n\n', 'utf8');

      try {
        // Cleanup
        fs.unlink(tmpFile);
      } catch (e) {
        this.log(chalk.red('Temporary file was not deleted: ' + e.message));
      }

      // Copy config
      await fs.copy(
        path.join(moduleCacheDir, 'slicknode.yml'),
        path.join(targetDir, 'slicknode.yml'),
      );

      this.log(chalk.green(
        '\n\nYour GraphQL Server is ready: \n\n' +
        '    ' + chalk.bold('Endpoint: ') + chalk.bold(project.endpoint) + '\n' +
        '    ' + chalk.bold('Name: ') + chalk.bold(project.name),
      ));
      this.log(`
Start exploring now...
- Open console: ${chalk.bold('slicknode console')}
- Open playground: ${chalk.bold('slicknode playground')}

Find more help in the documentation: http://slicknode.com
`);
    } catch (e) {
      this.error(
        `Initialization failed: ${e.message}`,
      );
    }
  }

  /**
   * Returns the closest data center
   * @returns {Promise.<void>}
   */
  public async getCluster(): Promise<ICluster | null> {
    cli.action.start('Load available clusters');
    const result = await this.getClient().fetch(LIST_CLUSTER_QUERY);
    const edges = _.get(result, 'data.listCluster.edges', []) as Array<{node: ICluster}>;

    const dcTimers = edges.map(async ({node}) => {
      const start = Date.now();
      let latency;
      try {
        await fetch(node.pingUrl);
        latency = Date.now() - start;
      } catch (e) {
        latency = null;
      }
      return {
        latency,
        cluster: node,
      };
    });

    let cluster = null;
    try {
      const timedDcs = await Promise.all(dcTimers);
      const availableDcs = timedDcs
        .filter((d) => d.latency !== null)
        .sort((a, b) => a.latency! < b.latency! ? 1 : 0);

      if (availableDcs.length) {
        cluster = availableDcs[0].cluster;
      }
    } catch (e) {
      cluster = null;
    }
    cli.action.stop();

    return cluster;
  }
}
