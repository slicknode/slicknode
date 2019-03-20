/**
 * Created by Ivo Meißner on 04.08.17.
 *
 * @flow
 */

import AdmZip from 'adm-zip';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import mkdirp from 'mkdirp';
import fetch from 'node-fetch';
import os from 'os';
import path from 'path';
import uuid from 'uuid';
import {ICluster} from '../../types/index';
import {
  randomName,
} from '../../utils/index';
import {
  isDirectory,
} from '../../validation/options';
import {Command} from '../command';

interface InitCommandOptions {
  dir?: string;
  name?: string;
  alias?: string;
  account?: string;
}

interface InitCommandArguments {
  name?: string;
}

export class InitCommand extends Command<InitCommandOptions, InitCommandArguments> {
  public static command = 'init';
  public static description = 'Initialize a new slicknode project';
  public static args = [
    {
      name: '[name]',
      description: 'The name of the project',
    },
  ];
  public static options = [
    {
      name: '-d, --dir <path>',
      description: 'The target directory, if other than current',
      validator: isDirectory,
    },
    {
      name: '-n, --name <name>',
      description: 'The name of the project as displayed in the console',
    },
    {
      name: '-a, --alias <alias>',
      description: 'The alias of the project which is part of the endpoint URL',
    },
    {
      name: '-a, --account <account>',
      description: 'The identifier of the account where the project should be deployed',
    },
  ];

  public async run() {
    // Check if directory is already initialized
    const env = await this.getEnvironment();
    if (env) {
      this.logger.error(chalk.red('The directory is already initialized as a slicknode project'));
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

    let {name, alias} = this.options;
    const account = this.options.account || null;

    // Create directory if name was provided via args and directory does not exist
    let targetDir = this.getProjectRoot();
    if (this.args.name && !this.options.dir) {
      try {
        targetDir = path.join(path.resolve(''), this.args.name);
        mkdirp.sync(targetDir);
      } catch (e) {
        this.logger.error(`ERROR: Failed to create project directory ${targetDir}. ${e.message}`);
      }
    }

    if (!name) {
      name = this.args.name ? this.args.name : randomName();
    }
    // Generate name and alias
    if (!alias) {
      alias = name.toLowerCase() + '-' + uuid.v4().substr(0, 8);
    }

    const cluster = await this.getCluster();
    if (!cluster) {
      this.logger.error(
        'Could not load available data centers. Make sure you have a working internet connection and try again later.',
      );
      return;
    }

    this.logger.log(`Creating project ${name}`);
    const query = `mutation CreateProject($input: createProjectInput!) {
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
    const variables = {
      input: {
        name,
        alias,
        cluster: cluster.id,
        account,
      },
    };
    const result = await this.client.fetch(query, variables);

    // Load bundle
    try {
      const project = _.get(result, 'data.createProject.node');
      if (!project) {
        this.logger.error(chalk.red('ERROR: Could not create project. Please try again later.'));
        if (result.errors && result.errors.length) {
          result.errors.forEach(
            (err) => this.logger.error(
              chalk.red(err.message),
            ),
          );
        }
        return;
      }
      const bundle = _.get(project, 'version.bundle');
      if (!bundle) {
        this.logger.error(chalk.red(
          'Project was created but could not be fully initialized, possibly because of no available capacity. ' +
          'Try to clone the project later.',
        ));
        return;
      }
      const response = await fetch(project.version.bundle);

      const tmpFile = path.join(os.tmpdir(), project.version.id + '.zip');
      try {
        fs.writeFileSync(tmpFile, await response.buffer());
      } catch (e) {
        this.logger.error(chalk.red(
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
        this.logger.info(chalk.red('Temporary file was not deleted: ' + e.message));
      }

      // Copy config
      await fs.copy(
        path.join(moduleCacheDir, 'slicknode.yml'),
        path.join(targetDir, 'slicknode.yml'),
      );

      this.logger.info(chalk.green(
        '\n\nYour GraphQL Server is ready: \n\n' +
        '    ' + chalk.bold('Endpoint: ') + chalk.bold(project.endpoint) + '\n' +
        '    ' + chalk.bold('Name: ') + chalk.bold(project.name),
      ));
      this.logger.info(`
Start exploring now...
- Open console: ${chalk.bold('slicknode console')}
- Open playground: ${chalk.bold('slicknode playground')}

Find more help in the documentation: http://slicknode.com
`);
    } catch (e) {
      this.logger.error(chalk.red(
        'Initialization failed: ', e,
      ));
    }
  }

  /**
   * Returns the closest data center
   * @returns {Promise.<void>}
   */
  public async getCluster(): Promise<ICluster | null> {
    const query = `query {
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
    const result = await this.client.fetch(query);
    const edges = _.get(result, 'data.listCluster.edges', []) as Array<{node: ICluster}>;
    this.logger.log('Determine closest data center');

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

    try {
      const timedDcs = await Promise.all(dcTimers);
      const availableDcs = timedDcs
        .filter((d) => d.latency !== null)
        .sort((a, b) => a.latency < b.latency ? 1 : 0);

      if (availableDcs.length) {
        return availableDcs[0].cluster;
      }
    } catch (e) {
      return null;
    }

    return null;
  }
}
