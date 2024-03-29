import Command, { flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import fs from 'fs';
import yaml from 'js-yaml';
import * as _ from 'lodash';
import fetch from 'node-fetch';
import os from 'os';
import * as path from 'path';
import type Client from '@slicknode/client-node';
import * as uuid from 'uuid';
import { ConfigStorage } from '../api/config-storage';
import { directory } from '../parsers';
import {
  IEnvironmentConfig,
  IEnvironmentConfigMap,
  IProjectConfig,
} from '../types';
import * as utils from '../utils';
import { spawn } from 'child_process';
import * as Parser from '@oclif/parser';
import { getClient } from '../utils/getClient';

/**
 * Interval in seconds in which to check for
 * @type {number}
 */
const VERSION_CHECK_INTERVAL = 60 * 60 * 24;

const LATEST_VERSION_CACHE_KEY = 'latestVersion';
const MIN_VERSION_CACHE_KEY = 'minVersion';
const LAST_VERSION_CHECK_CACHE_KEY = 'lastVersionCheck';

export class BaseCommand extends Command {
  public static flags = {
    dir: flags.string({
      char: 'd',
      parse: directory,
      description: 'The target directory, if other than current',
      default: './',
    }),
  };

  /**
   * Runs the command
   */
  public async run() {
    throw new Error('Run function is not implemented');
  }

  /**
   * Extend oclif parser to load .env files before parsing args, so flags etc. that have ENV variable name assigned
   * can be configured with .env file.
   */
  protected parse<
    F,
    A extends {
      [name: string]: any;
    }
  >(options?: Parser.Input<F>, argv?: string[]): Parser.Output<F, A> {
    // Load dotenv configuration
    require('dotenv').config();

    return super.parse(options);
  }

  /**
   * Opens the URL in the default browser of the operating system
   *
   * @param url
   */
  public openUrl(url: string): void {
    let command;
    switch (process.platform) {
      case 'darwin':
        command = 'open';
        break;
      case 'win32':
        command = 'explorer.exe';
        break;
      case 'linux':
        command = 'xdg-open';
        break;
      default:
        throw new Error(
          `Could not automatically open URL, unsupported platform ${process.platform}. ` +
            `Open the URL ${url} in your browser`
        );
    }

    const child = spawn(command, [url]);
    child.stderr.setEncoding('utf8');
    let errorMessage = '';
    child.stderr.on('data', (data) => {
      errorMessage += data;
    });

    child.stderr.on('end', () => {
      if (errorMessage) {
        throw new Error(errorMessage);
      }
    });
  }

  /**
   * Returns an instance of the client to the Slicknode API
   */
  public async getClient(): Promise<Client> {
    return await getClient({
      configStorage: this.getConfigStorage(),
      userAgent: this.config.userAgent,
    });

    // const Client = (await importDynamic('@slicknode/client-node')).default;
    // const authStorage = new ConfigStorage(
    //   path.join(os.homedir(), '.slicknode', 'auth.json')
    // );
    // const configStorage = this.getConfigStorage();

    // // Build config
    // const config = {
    //   // Default values
    //   endpoint: DEFAULT_API_ENDPOINT,

    //   // Overwrite locally configured default values
    //   ...configStorage.getValues(),
    // };

    // return new Client({
    //   endpoint: config.endpoint,
    //   storage: authStorage,
    //   headers: {
    //     'User-Agent': this.config.userAgent,
    //   },
    // });
  }

  protected getConfigStorage(): ConfigStorage {
    return new ConfigStorage(
      path.join(os.homedir(), '.slicknode', 'config.json')
    );
  }

  /**
   * @returns {Promise.<void>}
   */
  protected async authenticate(): Promise<boolean> {
    const client = await this.getClient();
    if (client.hasAccessToken()) {
      return true;
    }

    // Refresh access token
    if (client.hasRefreshToken()) {
      cli.action.start('Authenticating');

      // We just fetch viewer which will trigger token refresh in client
      const userResult = await client.fetch('query {viewer {user {id}}}');
      cli.action.stop();
      if (_.get(userResult, 'data.viewer.user.id')) {
        return client.hasAccessToken();
      }
    }

    // @TODO: Add support for permanent auth tokens via env vars, args

    // Get auth request token
    const state = uuid.v4(); // Generate state
    cli.action.start('Creating auth request');
    const authRequestResult = await client.fetch(
      CREATE_API_AUTH_REQUEST_MUTATION,
      {
        input: {
          state,
        },
      }
    );
    const { authUrl, node } =
      authRequestResult?.data?.createApiAuthRequest || {};
    if (!authUrl || !node?.token) {
      this.error(
        `Error creating auth request: ${
          authRequestResult?.errors?.[0]?.message || 'Please try again'
        }`
      );
      return false;
    }

    // Redirect user to
    cli.action.stop();

    this.log(`Visit this URL to authenticate your device: ${authUrl}\n`);
    this.log('Opening URL in browser...');
    this.openUrl(authUrl);

    cli.action.start('Waiting for authorization');
    const timeout = new Date().getTime() + 5 * 60 * 1000;
    while (timeout > new Date().getTime()) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = await client.fetch(LOGIN_API_AUTH_REQUEST_MUTATION, {
        input: { token: node.token, state },
      });
      if (result?.data?.loginApiAuthRequest) {
        client.setAuthTokenSet(result?.data?.loginApiAuthRequest);
        cli.action.stop();
        this.log('\n', chalk.green.bold('Login successful!'), '\n');
        return true;
      }
    }
    cli.action.stop();
    this.error('Authentication request timed out, please restart the process.');
    return false;
  }

  /**
   * Checks if the CLI version is too old.
   * If there is a newer version available, logs a message. If the current version is incompatible
   * with the API, returns true.
   */
  protected async updateRequired(useCache: boolean = true): Promise<boolean> {
    const configStorage = this.getConfigStorage();
    const lastVersionCheck = parseInt(
      configStorage.getItem(LAST_VERSION_CHECK_CACHE_KEY) || '0',
      10
    );
    let minVersion = configStorage.getItem(MIN_VERSION_CACHE_KEY);
    let latestVersion = configStorage.getItem(LATEST_VERSION_CACHE_KEY);
    let currentVersion;

    // Get current version
    try {
      const data = fs.readFileSync(
        path.resolve(__dirname, '../../package.json'),
        'utf8'
      );
      currentVersion = JSON.parse(data).version;
      if (!currentVersion) {
        throw new Error('No version found');
      }
    } catch (e: any) {
      throw new Error('Could not read version from package.json: ' + e.message);
    }

    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const cacheExpired =
      currentTimestamp - VERSION_CHECK_INTERVAL > lastVersionCheck;

    if (!useCache || cacheExpired) {
      // Load latest version number from npm
      try {
        const npmResponse = await fetch('https://registry.npmjs.org/slicknode');
        const data = await npmResponse.json();
        latestVersion = _.get(data, 'dist-tags.latest') || currentVersion;

        // Cache value
        if (latestVersion) {
          configStorage.setItem(LATEST_VERSION_CACHE_KEY, latestVersion);
        }
        if (utils.semverCompare(currentVersion, latestVersion || '') === 0) {
          configStorage.setItem(
            LAST_VERSION_CHECK_CACHE_KEY,
            String(currentTimestamp)
          );
          return false;
        }
      } catch (e: any) {
        this.log(
          'Error checking for updates. Make sure you have an active internet connection.'
        );
      }
    }

    // Get minimum required version from API
    if (!useCache || cacheExpired || !minVersion) {
      try {
        const query = '{minCliVersion}';
        const client = await this.getClient();
        const apiResult = await client.fetch(query);
        const resultMinVersion = _.get(apiResult, 'data.minCliVersion');
        if (resultMinVersion) {
          configStorage.setItem(MIN_VERSION_CACHE_KEY, resultMinVersion);
          configStorage.setItem(
            LAST_VERSION_CHECK_CACHE_KEY,
            String(currentTimestamp)
          );
          minVersion = String(resultMinVersion);
        }
      } catch (e: any) {
        this.log(
          'Error checking for updates. Make sure you have an active internet connection.'
        );
        return false;
      }
    }

    // Compare current with min version
    try {
      if (utils.semverCompare(currentVersion, String(minVersion)) < 0) {
        this.error(
          chalk.red(
            `ERROR: Your slicknode CLI version (${currentVersion}) is outdated and ` +
              'incompatible with the current Slicknode API.\n' +
              'To upgrade to the latest version, run: \n\n' +
              '  npm install -g slicknode@latest\n'
          )
        );
        return true;
      }
    } catch (e: any) {
      this.log(
        'Error checking for updates. Make sure you have an active internet connection.'
      );
      return false;
    }

    // Compare current with latest version
    try {
      if (
        latestVersion &&
        utils.semverCompare(currentVersion, String(latestVersion)) < 0
      ) {
        this.error(
          `INFO: There is a new slicknode CLI version (${latestVersion}) available.\n` +
            'To upgrade to the latest version, run: \n\n' +
            '  npm install -g slicknode@latest\n'
        );
      }
    } catch (e: any) {
      return false;
    }

    return false;
  }

  /**
   * The Returns the environment config with the given key
   * NULL if could not be found
   *
   * @param name
   * @param silent
   * @returns {Promise.<void>}
   */
  public async getEnvironment(
    name: string = 'default',
    silent: boolean = false
  ): Promise<IEnvironmentConfig | null> {
    try {
      const dir = this.getProjectRoot();
      const data = fs.readFileSync(path.join(dir, '.slicknoderc'), 'utf8');
      try {
        const envMap = yaml.safeLoad(data) as any;
        if (typeof envMap === 'object' && envMap.hasOwnProperty(name)) {
          // @TODO: Validate
          return envMap[name];
        }

        return null;
      } catch (e: any) {
        this.error(
          chalk.red('Could not parse .slicknoderc file.\n' + e.message)
        );
        return null;
      }
    } catch (e: any) {
      if (!silent) {
        this.log(
          'There are no environments created yet. \n' +
            'To create a new environment, deploy the project:\n\n' +
            '  ' +
            chalk.bold('slicknode deploy') +
            '\n'
        );
      }
      return null;
    }
  }

  /**
   * Updates the environment configuration
   * @param name
   * @param config
   * @param targetDir
   * @returns {Promise.<*>}
   */
  public async updateEnvironment(
    name: string,
    config: IEnvironmentConfig | null,
    targetDir: string | null = null
  ): Promise<null> {
    // eslint-disable-line no-unused-vars
    // Read existing config
    let envMap: IEnvironmentConfigMap = {};
    try {
      const dir = targetDir || this.getProjectRoot();
      const configFile = path.join(dir, '.slicknoderc');
      let data = '{}';
      try {
        data = fs.readFileSync(configFile, 'utf8');
      } catch (e: any) {
        this.log(
          'No .slicknoderc file found. Creating new environment config.'
        );
      }

      try {
        envMap = JSON.parse(data);
        if (typeof envMap !== 'object') {
          throw new Error('.slicknoderc file has an invalid format');
        }
      } catch (e: any) {
        this.error(
          chalk.red('Could not parse .slicknoderc file.\n' + e.message)
        );
        return null;
      }

      // If we have value, update environment config
      if (config) {
        // @TODO: Validate
        envMap[name] = config;
      } else {
        // Remove environment from env map
        delete envMap[name];
      }

      // Write new .slicknoderc file
      fs.writeFileSync(configFile, JSON.stringify(envMap, null, 2));

      return null;
    } catch (e: any) {
      this.log(
        'There are no environments created yet. \n' +
          'To create a new environment, deploy the project:\n\n' +
          '  ' +
          chalk.bold('slicknode deploy') +
          '\n'
      );
      return null;
    }
  }

  /**
   * Returns the project config
   * @returns {Promise.<null>}
   */
  protected async getConfig(dir?: string): Promise<IProjectConfig | null> {
    try {
      const data = fs.readFileSync(
        path.join(dir || this.getProjectRoot(), 'slicknode.yml'),
        'utf8'
      );
      try {
        // @TODO: Validate
        return (yaml.safeLoad(data) as IProjectConfig) || null;
      } catch (e: any) {
        this.error(
          chalk.red('Could not parse slicknode.yml file.\n' + e.message)
        );
      }
    } catch (e: any) {
      this.error(
        'This directory does not have a valid slicknode.yml file. \n' +
          'Are you running it in the right directory (project root)? \n' +
          'To initialize a new project, run:\n\n' +
          '  ' +
          chalk.bold('slicknode init') +
          '\n'
      );
    }

    return null;
  }

  /**
   * Returns the path to the project root directory
   */
  protected getProjectRoot(): string {
    const options = this.parse(this.constructor as any) as any;
    return path.resolve(options.flags.dir);
  }

  /**
   * Returns the private modules dir
   */
  protected getDefaultModulesDir(): string {
    return path.join(this.getProjectRoot(), 'modules');
  }
}

export const CREATE_API_AUTH_REQUEST_MUTATION = `mutation AuthRequestMutation(
  $input: createApiAuthRequestInput!
) {
  createApiAuthRequest(input: $input) {
    node {
      token
    }
    authUrl
  }
}
`;

export const LOGIN_API_AUTH_REQUEST_MUTATION = `mutation LoginAuthRequestMutation($input: loginApiAuthRequestInput!) {
  loginApiAuthRequest(input: $input) {
    accessToken
    accessTokenLifetime
    refreshToken
    refreshTokenLifetime
  }
}`;
