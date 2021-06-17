/**
 * Created by Ivo Meißner on 08.08.17.
 */
import { flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as _ from 'lodash';
import { BaseCommand } from '../base/base-command';
import validate from '../validation/validate';
import express from 'express';
import { createHandler } from '@slicknode/slicknode-express';
import morgan from 'morgan';

export default class StartCommand extends BaseCommand {
  public static command = 'start';
  public static description = 'Starts the Slicknode GraphQL server';

  public static flags = {
    ...BaseCommand.flags,
    port: flags.integer({
      char: 'p',
      description: 'Port on which to listen for HTTP requests',
      default: 3000,
      env: 'SLICKNODE_PORT',
    }),
    'db-schema': flags.string({
      char: 's',
      description: 'The DB schema name where the data is stored',
      env: 'SLICKNODE_DB_SCHEMA',
      default: 'slicknode',
      required: true,
    }),
    'db-connection': flags.string({
      char: 'c',
      description: 'PostgreSQL DB connection string',
      env: 'SLICKNODE_DB_CONNECTION',
      required: true,
    }),
    'admin-secret': flags.string({
      description:
        'The admin secret to connect the API to the Slicknode console (min 20 characters)',
      env: 'SLICKNODE_ADMIN_SECRET',
    }),
    watch: flags.boolean({
      char: 'w',
      description:
        'Watch for file system changes and hot reload handlers and schema',
    }),
    'force-migrate': flags.boolean({
      char: 'f',
      description:
        'Automatically apply DB migrations on start. WARNING: Applies migrations immediately when watch mode is on.',
    }),
  };

  public async run() {
    const input = this.parse(StartCommand);

    // Check if directory is initialized
    cli.action.start('Loading configuration', this.getProjectRoot());
    const config = await this.getConfig();
    if (!config) {
      return;
    }
    cli.action.stop();

    cli.action.start('Validating project');
    const errors = await validate(this.getProjectRoot(), config);
    cli.action.stop();

    // Check for version updates
    cli.action.start('Check for updates');
    if (await this.updateRequired()) {
      return;
    }
    cli.action.stop();

    if (errors.length) {
      this.error(chalk.red('Project configuration has errors: \n'), {
        exit: false,
      });
      errors.forEach((error, index) => {
        this.error(chalk.red(`  ${index + 1}. ${error.toString()}\n`), {
          exit: false,
        });
      });
      this.error('Abort');
    }

    const app = express();

    // Enable logging
    app.use(morgan('short'));

    app.use(
      '/',
      createHandler({
        // Path to your Slicknode project root dir
        dir: this.getProjectRoot(),

        // Automatically apply migrations on start (Can easily lead to accidental data deletion)
        forceMigrate: input.flags['force-migrate'],

        // Automatically watch for file system changes (dev mode)
        watch: input.flags.watch,

        // Database configuration
        database: {
          // Database schema name to use for the project
          schemaName: input.flags['db-schema'],

          connection: {
            // PostgreSQL connection URL
            url: input.flags['db-connection'],
          },
        },
        // Enable Slicknode console integration
        admin:
          (input.flags['admin-secret'] && {
            // Admin secret that is also setup in the Slicknode console (min 20 characters)
            secret: input.flags['admin-secret'],
          }) ||
          undefined,
      })
    );
    app.listen(input.flags.port, () => {
      console.log(`Server listening on: http://localhost:${input.flags.port}`);
    });
  }
}
