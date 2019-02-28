#!/usr/bin/env node

/**
 * Created by Ivo Meißner on 11.08.17.
 *
 * @flow
 */

import program from 'caporal';
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Client from 'slicknode-client';
import {ConfigStorage} from './api';
import commands from './commands';
import {Command} from './commands/command';
import {
  DEFAULT_API_ENDPOINT,
} from './config';
import {ConsoleLogger} from './logging';

function run() {
  try {
    const data = fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8');
    program.version(JSON.parse(data).version || '0.0.0');
  } catch (e) {
    throw new Error('Could not read version from package.json: ' + e.message);
  }

  commands.forEach(((command: typeof Command) => {
    const cmd = program.command(command.command, command.description);

    // Add arguments
    (command.args || []).forEach((arg) => cmd.argument(arg.name, arg.description, arg.validator));

    // Add options
    (command.options || []).forEach((opt) => cmd.option(opt.name, opt.description, opt.validator));

    cmd.action((args, options) => {
      const logger = new ConsoleLogger();
      const authStorage = new ConfigStorage(path.join(os.homedir(), '.slicknode', 'auth.json'));
      const configStorage = new ConfigStorage(path.join(os.homedir(), '.slicknode', 'config.json'));

      // Build config
      const config = {
        // Default values
        endpoint: DEFAULT_API_ENDPOINT,

        // Overwrite locally configured default values
        ...configStorage.getValues(),
      };

      const client = new Client({
        endpoint: config.endpoint,
        storage: authStorage,
      });
      const env = {
        program,
        logger,
        client,
        configStorage,
        args: args || {},
        options: options || {},
      };
      const commandInstance = new command(env);

      commandInstance.run()
        .then(() => {
          process.exit(logger.errorLogged() ? 1 : 0);
        })
        .catch((err: Error) => {
          logger.error(chalk.red(`ERROR: ${err.message}`));
          process.exit(1);
        });
    });
  }));

  program.parse(process.argv);
}

run();
