/**
 * Created by Ivo Meißner on 08.08.17.
 */
import { flags } from '@oclif/command';
import chalk from 'chalk';
import cli from 'cli-ux';
import * as _ from 'lodash';
import { BaseCommand } from '../base/base-command';
import validate from '../validation/validate';
import express, { Express } from 'express';
import morgan from 'morgan';
import { databaseSchema, databaseUrl } from '../flags/configFlags';
import { file } from '../parsers/file';
import { readFile } from 'fs-extra';
import yaml from 'js-yaml';
import * as AWS from 'aws-sdk';
import { Server } from 'net';
import { importDynamic } from '../utils/importDynamic';

// Export server instance so we can close this in tests
// @TODO: Figure out a nicer way to handle long running processes with fancytest and proper cleanup
let server: Server | null = null;
export function getServer(): Server | null {
  return server;
}
export function setServer(s: Server | null) {
  server = s;
}

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
    'database-schema': databaseSchema,
    'database-url': databaseUrl,
    settings: flags.string({
      description: 'Path to a YAML file for module settings',
      parse: file(),
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
    's3-image-endpoint': flags.string({
      env: 'SLICKNODE_S3_IMAGE_ENDPOINT',
      description:
        'The S3 service endpoint for the image bucket, for example: https://s3.us-west-1.amazonaws.com',
    }),
    's3-image-endpoint-cdn': flags.string({
      env: 'SLICKNODE_S3_IMAGE_ENDPOINT_CDN',
      description:
        'Public endpoint for the images. If no CDN is used, should point to `http(s)://<your-slicknode-endpoint>/images/`',
    }),
    's3-image-bucket': flags.string({
      description: 'S3 bucket where images are stored',
      env: 'SLICKNODE_S3_IMAGE_BUCKET',
    }),
    'image-thumbnail-secret': flags.string({
      description: 'Secret to generate unguessable URLs to image thumbnails',
      env: 'SLICKNODE_IMAGE_THUMBNAIL_SECRET',
    }),
    's3-access-key-id': flags.string({
      description: 'AWS access key ID for S3 storage',
      env: 'SLICKNODE_S3_AWS_ACCESS_KEY_ID',
    }),
    's3-secret-access-key': flags.string({
      description: 'AWS secret access key for S3 storage',
      env: 'SLICKNODE_S3_AWS_SECRET_ACCESS_KEY',
    }),
  };

  public async run() {
    const input = this.parse(StartCommand);
    const { createHandler } = await importDynamic(
      '@slicknode/slicknode-express'
    );

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
      this.error('Abort');
    }

    let moduleSettings = {};
    if (input.flags.settings) {
      try {
        const content = await readFile(input.flags.settings);

        const envMap = yaml.safeLoad(content.toString('utf-8')) as any;
        if (
          typeof envMap !== 'object' ||
          envMap.hasOwnProperty('moduleSettings')
        ) {
          // @TODO: Validate
          moduleSettings = envMap.moduleSettings;
        }
      } catch (e: any) {
        this.error(
          `Failed to load settings file "${input.flags.settings}": ${e.message}`
        );
      }
    } else {
      this.log(
        'No settings path configured, modules settings will not be available'
      );
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
          schemaName: input.flags['database-schema'],

          connection: {
            // PostgreSQL connection URL
            url: input.flags['database-url'],
          },
        },
        // Enable Slicknode console integration
        admin:
          (input.flags['admin-secret'] && {
            // Admin secret that is also setup in the Slicknode console (min 20 characters)
            secret: input.flags['admin-secret'],
          }) ||
          undefined,

        // Set module settings
        moduleSettings,

        // Endpoint for the connection back to the handler functions
        projectEndpoint: `http://localhost:${input.flags.port}`,

        // Configure image handler
        images:
          (input.flags['s3-image-bucket'] &&
            input.flags['image-thumbnail-secret'] && {
              bucket: input.flags['s3-image-bucket'],
              secret: input.flags['image-thumbnail-secret'],
              clientConfig:
                (input.flags['s3-access-key-id'] &&
                  input.flags['s3-secret-access-key'] && {
                    endpoint: input.flags['s3-image-endpoint'],
                    s3ForcePathStyle: true, // Needed for compatibility with backends like with minio
                    credentials: new AWS.Credentials({
                      accessKeyId: input.flags['s3-access-key-id'],
                      secretAccessKey: input.flags['s3-secret-access-key'],
                    }),
                  }) ||
                undefined,
            }) ||
          undefined,
      })
    );
    server = app.listen(input.flags.port, () => {
      console.log(`Server listening on: http://localhost:${input.flags.port}`);
    });
  }
}
