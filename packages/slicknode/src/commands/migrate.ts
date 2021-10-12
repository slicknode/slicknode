import { flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as _ from 'lodash';
import { BaseCommand } from '../base/base-command';
import validate from '../validation/validate';
import Knex from 'knex';
import { printErrors, printChanges } from '../utils/printStatus';
import inquirer from 'inquirer';
import { databaseSchema, databaseUrl } from '../flags/configFlags';
import type { ModuleConfig } from '@slicknode/core';

export default class MigrateCommand extends BaseCommand {
  public static command = 'migrate';
  public static description = 'Migrates the database to the current state';

  public static flags = {
    ...BaseCommand.flags,
    'database-schema': databaseSchema,
    'database-url': databaseUrl,
    force: flags.boolean({
      char: 'f',
      description:
        'Apply migrations immediately without asking for confirmation',
    }),
  };

  public async run() {
    const {
      buildModules,
      validateProject,
      loadCurrentModules,
      detectChanges,
      migrateModules,
      createProjectSchema,
      DB_SETUP_QUERIES,
    } = await import('@slicknode/core');

    const input = this.parse(MigrateCommand);

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
    cli.action.start('Checking for updates');
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
      return this.error('Abort');
    }
    cli.action.start('Creating changeset');
    const modules = await buildModules(this.getProjectRoot());

    // Create DB connection
    const conn = Knex({
      client: 'pg',
      connection: input.flags['database-url'],
      acquireConnectionTimeout: 5000,
    });
    const schemaName = input.flags['database-schema'];

    let currentModules: ModuleConfig[] = [];
    try {
      currentModules =
        (await loadCurrentModules({
          db: conn,
          schemaName,
        })) || [];
    } catch (err: any) {
      return this.error(
        `Failed to load current project status from DB: ${err.message}`
      );
    }
    cli.action.stop();

    if (!currentModules) {
      cli.action.stop();
      if (!input.flags.force) {
        const values = (await inquirer.prompt([
          {
            name: 'confirm',
            type: 'confirm',
            message:
              `The schema "${schemaName}" is not initialized yet.\n` +
              `Do you want to initialize the schema as a Slicknode project?`,
            default: false,
          },
        ])) as { confirm: boolean };
        if (!values.confirm) {
          this.error('Migration aborted by user');
        }
      }
      cli.action.start('Initializing database schema');
      for (let setupQuery of DB_SETUP_QUERIES) {
        await conn.raw(setupQuery);
      }
      await createProjectSchema({ db: conn, schemaName });

      currentModules = [];
      cli.action.stop();
    }

    // Ensure migration is valid
    const projectErrors = validateProject(modules, currentModules);
    if (projectErrors.length) {
      printErrors(
        projectErrors.map((err) => ({
          description: err.description,
          path: err.path || [],
          module: err.module || '',
        })),
        this.log
      );
      return this.error('Migration aborted');
    }

    // Print changes
    const changes = detectChanges(currentModules, modules);
    printChanges(
      changes.map((change) => ({
        description: change.description,
        path: change.path || [],
        module: change.app,
        breaking: change.breaking || false,
        type: change.type,
      })),
      this.log
    );

    // Ask for confirmation
    if (!input.flags.force) {
      const values = (await inquirer.prompt([
        {
          name: 'confirm',
          type: 'confirm',
          message: 'Do you want to apply the migration?',
          default: false,
        },
      ])) as { confirm: boolean };
      if (!values.confirm) {
        this.log('Migration aborted by user');
        return;
      }
    }

    // We run actual migration in transaction because current project state is persisted
    // in DB and incomplete migrations could set project into inconsistent state
    cli.action.start('Apply DB migrations');
    await conn.transaction(async (db) => {
      await migrateModules(modules, db, schemaName);
    });
    cli.action.stop();
    this.log('Migration applied successfully');
  }
}
