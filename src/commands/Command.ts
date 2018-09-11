/**
 * Created by Ivo Meißner on 17.08.17.
 *
 * @flow
 */

import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import 'isomorphic-fetch';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import loginAuthenticator from 'slicknode-auth-email-password';
import Client from 'slicknode-client';
import validator from 'validator';
import ConfigStorage from '../api/ConfigStorage';
import {
  IEnvironmentConfig,
  IEnvironmentConfigMap,
  ILogger, IProjectConfig,
} from '../types';
import {
  semverCompare,
} from '../utils';

export interface IOption {
  name: string;
  description: string;
  validator?: ValidatorArg;
}

export type OptionList = IOption[];

export interface IArgument {
  name: string;
  description: string;
  validator?: ValidatorArg;
}

export type ArgumentList = IArgument[];

interface ICommandEnv<TOptions, TArguments> {
  configStorage: ConfigStorage;
  client: Client;
  logger: ILogger;
  args: TArguments;
  options: TOptions;
}

/**
 * Interval in seconds in which to check for
 * @type {number}
 */
const VERSION_CHECK_INTERVAL = 60 * 60 * 24;

const LATEST_VERSION_CACHE_KEY = 'latestVersion';
const MIN_VERSION_CACHE_KEY = 'minVersion';
const LAST_VERSION_CHECK_CACHE_KEY = 'lastVersionCheck';

export default class Command<TOptions, TArguments> {
  /**
   * Name of the command
   */
  public static command: string;

  /**
   * Description of the command
   */
  public static description: string;

  /**
   * Arguments
   */
  public static args: ArgumentList | null;

  /**
   * Options
   */
  public static options: OptionList | null;

  public client: Client;
  public logger: ILogger;
  public args: TArguments;
  public options: TOptions & {
    dir?: string,
  };
  public configStorage: ConfigStorage;

  constructor(env: ICommandEnv<TOptions, TArguments>) {
    this.client = env.client;
    this.logger = env.logger;
    this.options = env.options;
    this.args = env.args;
    this.configStorage = env.configStorage;
  }

  /**
   * Runs the command
   */
  public async run() {
    throw new Error('Run function is not implemented');
  }

  /**
   * @returns {Promise.<void>}
   */
  public async authenticate(): Promise<boolean> {
    if (this.client.hasAccessToken()) {
      return true;
    }
    const {log, error} = this.logger;

    // Refresh access token
    if (this.client.hasRefreshToken()) {
      log('Logging in to the slicknode servers...');
      const userResult = await this.client.fetch('query {viewer {user {id}}}');
      if (_.get(userResult, 'data.viewer.user.id')) {
        return this.client.hasAccessToken();
      }
    }

    // Ask for username password
    log('\n' + chalk.bold('Login:'));
    log('Enter email address and password of your slicknode account');
    log(`
  You don't have an account yet?
  Get your FREE account at: ${chalk.bold('slicknode.com')}
  `);

    let loginCount = 0;

    while (loginCount < 3) {
      const input = await inquirer.prompt([
        {
          name: 'email',
          message: 'Email:',
          validate(value) {
            return validator.isEmail(value) || 'Please enter a valid email address';
          },
        },
        {
          name: 'password',
          message: 'Password:',
          type: 'password',
          validate(value) {
            return value.length >= 8 || 'Please enter a valid password';
          },
        },
      ]) as {email: string, password: string};

      try {
        await this.client.authenticate(loginAuthenticator(input.email, input.password));

        log('\n', chalk.green.bold('Login successful!'), '\n');

        return true;
      } catch (e) {
        error(chalk.red('Login failed, please try again. Message:', e.message));
      }
      loginCount++;
    }

    error(chalk.red('Authentication failed. Please try again.'));
    return false;
  }

  /**
   * Checks if the CLI version is too old.
   * If there is a newer version available, logs a message. If the current version is incompatible
   * with the API, returns true.
   */
  public async updateRequired(useCache: boolean = true): Promise<boolean> {
    const lastVersionCheck = parseInt(this.configStorage.getItem(LAST_VERSION_CHECK_CACHE_KEY) || '0', 10);
    let minVersion = this.configStorage.getItem(MIN_VERSION_CACHE_KEY);
    let latestVersion = this.configStorage.getItem(LATEST_VERSION_CACHE_KEY);
    let currentVersion;

    // Get current version
    try {
      const data = fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8');
      currentVersion = JSON.parse(data).version;
      if (!currentVersion) {
        throw new Error('No version found');
      }
    } catch (e) {
      throw new Error('Could not read version from package.json: ' + e.message);
    }

    const currentTimestamp = Math.floor((new Date()).getTime() / 1000);
    const cacheExpired = (currentTimestamp - VERSION_CHECK_INTERVAL > lastVersionCheck);

    if (!useCache || cacheExpired) {
      // Load latest version number from npm
      try {
        const npmResponse = await fetch('https://registry.npmjs.org/slicknode');
        const data = await npmResponse.json();
        latestVersion = _.get(data, 'dist-tags.latest') || currentVersion;

        // Cache value
        if (latestVersion) {
          this.configStorage.setItem(LATEST_VERSION_CACHE_KEY, latestVersion);
        }
        if (semverCompare(currentVersion, latestVersion) === 0) {
          this.configStorage.setItem(LAST_VERSION_CHECK_CACHE_KEY, String(currentTimestamp));
          return false;
        }
      } catch (e) {
        this.logger.log('Error checking for updates. Make sure you have an active internet connection.');
      }
    }

    // Get minimum required version from API
    if (!useCache || cacheExpired || !minVersion) {
      try {
        const query = '{minCliVersion}';
        const apiResult = await this.client.fetch(query);
        const resultMinVersion = _.get(apiResult, 'data.minCliVersion');
        if (resultMinVersion) {
          this.configStorage.setItem(MIN_VERSION_CACHE_KEY, resultMinVersion);
          this.configStorage.setItem(LAST_VERSION_CHECK_CACHE_KEY, String(currentTimestamp));
          minVersion = String(resultMinVersion);
        }
      } catch (e) {
        this.logger.log('Error checking for updates. Make sure you have an active internet connection.');
        return false;
      }
    }

    // Compare current with min version
    try {
      if (semverCompare(currentVersion, String(minVersion)) < 0) {
        this.logger.error(chalk.red(
          `ERROR: Your slicknode CLI version (${currentVersion}) is outdated and ` +
          'incompatible with the current Slicknode API.\n' +
          'To upgrade to the latest version, run: \n\n' +
          '  npm update -g slicknode\n',
        ));
        return true;
      }
    } catch (e) {
      this.logger.log('Error checking for updates. Make sure you have an active internet connection.');
      return false;
    }

    // Compare current with latest version
    try {
      if (latestVersion && semverCompare(currentVersion, String(latestVersion)) < 0) {
        this.logger.error(
          `INFO: There is a new slicknode CLI version (${latestVersion}) available.\n` +
          'To upgrade to the latest version, run: \n\n' +
          '  npm update -g slicknode\n',
        );
      }
    } catch (e) {
      return false;
    }

    return false;
  }

  /**
   * The Returns the environment config with the given key
   * NULL if could not be found
   *
   * @param name
   * @returns {Promise.<void>}
   */
  public async getEnvironment(name: string = 'default'): Promise<IEnvironmentConfig | null> {
    try {
      const directory = this.getProjectRoot();
      const data = fs.readFileSync(
        path.join(directory, '.slicknoderc'),
        'utf8',
      );
      try {
        const envMap = yaml.safeLoad(data);
        if (typeof envMap === 'object' && envMap.hasOwnProperty(name)) {
          // @TODO: Validate
          return envMap[name];
        }

        return null;
      } catch (e) {
        if (this.logger) {
          this.logger.error(chalk.red(
            'Could not parse .slicknoderc file.\n' +
            e.message,
          ));
        }
        return null;
      }
    } catch (e) {
      if (this.logger) {
        this.logger.info(
          'There are no environments created yet. \n' +
          'To create a new environment, run:\n\n' +
          '  ' + chalk.bold('slicknode init') + '\n',
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
    targetDir: string | null = null,
  ): Promise<null> { // eslint-disable-line no-unused-vars
    // Read existing config
    let envMap: IEnvironmentConfigMap = {};
    try {
      const directory = targetDir || this.getProjectRoot();
      const configFile = path.join(directory, '.slicknoderc');
      let data = '{}';
      try {
        data = fs.readFileSync(configFile, 'utf8');
      } catch (e) {
        this.logger.info('No .slicknoderc file found. Creating new environment config.');
      }

      try {
        envMap = JSON.parse(data);
        if (typeof envMap !== 'object') {
          throw new Error('.slicknoderc file has an invalid format');
        }
      } catch (e) {
        if (this.logger) {
          this.logger.error(chalk.red(
            'Could not parse .slicknoderc file.\n' +
            e.message,
          ));
        }
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
    } catch (e) {
      if (this.logger) {
        this.logger.info(
          'There are no environments created yet. \n' +
          'To create a new environment, run:\n\n' +
          '  ' + chalk.bold('slicknode init') + '\n',
        );
      }
      return null;
    }
  }

  /**
   * Returns the project config
   * @returns {Promise.<null>}
   */
  public async getConfig(): Promise<IProjectConfig | null> {
    try {
      const data = fs.readFileSync(
        path.join(this.getProjectRoot(), 'slicknode.yml'),
        'utf8',
      );
      try {
        // @TODO: Validate
        return yaml.safeLoad(data) || null;
      } catch (e) {
        if (this.logger) {
          this.logger.error(chalk.red(
            'Could not parse slicknode.yml file.\n' +
            e.message,
          ));
        }
      }
    } catch (e) {
      if (this.logger) {
        this.logger.error(
          'This directory does not have a valid slicknode.yml file. \n' +
          'To initialize a new project, run:\n\n' +
          '  ' + chalk.bold('slicknode init') + '\n',
        );
      }
    }

    return null;
  }

  /**
   * Returns the path to the project root directory
   */
  public getProjectRoot(): string {
    return path.resolve(this.options.hasOwnProperty('dir') && this.options.dir || '');
  }

  /**
   * Returns the private modules dir
   */
  public getDefaultModulesDir(): string {
    return path.join(this.getProjectRoot(), 'modules');
  }
}
