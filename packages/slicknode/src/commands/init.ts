import { flags } from '@oclif/command';
import cli from 'cli-ux';
import { mkdirpSync, pathExists, readdir, statSync } from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import { Uploadable } from '@slicknode/client-node';
import * as uuid from 'uuid';
import validator from 'validator';
import { BaseCommand } from '../base/base-command';

import { execSync } from 'child_process';
import { packProject, randomName } from '../utils';
import { importGitRepository } from '../utils/importGitRepository';
import { pullDependencies } from '../utils/pullDependencies';
import { copyTemplate } from '../utils/copyTemplate';
import { directory } from '../parsers';

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
          validator.isURL(value, {
            protocols: ['http', 'https', 'ssh', 'git'],
          })
        ) {
          return value;
        }

        const [basePath] = value.split('#');
        let isDirectory = false;
        try {
          isDirectory = statSync(basePath).isDirectory();
        } catch (e) {
          // ignore
        }
        if (!isDirectory) {
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
      } catch (e: any) {
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
          const npmInstallResult = execSync('npm install --prefer-online', {
            cwd: targetDir,
            encoding: 'utf8',
            stdio: 'inherit',
          });
          cli.action.stop();
          if (npmInstallResult) {
            this.log(npmInstallResult);
          }
        }
      } catch (e: any) {
        this.error(`Error loading project template: ${e.message}`);
        return;
      }
    } else {
      // Copy empty template
      await copyTemplate(
        path.join(__dirname, '../', 'templates', 'projects', 'blank'),
        targetDir,
        {
          SLICKNODE_VERSION: this.config.version,
          PROJECT_ALIAS: alias,
        }
      );
    }

    // Load dependencies
    try {
      // Read root slicknode.yml
      const config = await this.getConfig(targetDir);
      if (!config) {
        throw new Error('No valid slicknode.yml found in project template');
      }

      // Pull dependencies
      await pullDependencies({
        client: await this.getClient(),
        config,
        dir: targetDir,
      });
      this.log(`SUCCESS! Project initialized: \n${targetDir}

You can now deploy the project to the Slicknode Cloud:
${input.args.name ? `\n    cd ./${input.args.name}` : ''}
    slicknode deploy

Check out the docs for more help: https://slicknode.com/docs/
`);
    } catch (e: any) {
      this.error(`Initialization failed: ${e.message}`);
    }
  }
}
