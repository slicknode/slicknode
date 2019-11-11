import {flags} from '@oclif/command';
import bodyParser from 'body-parser';
import * as express from 'express';
import {SlicknodeRuntime} from 'slicknode-runtime';
import {BaseCommand} from '../../base/base-command';
import {getModuleList} from '../../utils';

const DEFAULT_PORT = 5100;

// Export express so we can mock it in tests
export const ExpressImport = express;

export class RuntimeStartCommand extends BaseCommand {
  public static description = 'Builds the source package for the runtime to be deployed';
  public static args = [
    {
      name: 'output',
      description: 'The target output directory or file of the built source bundle',
    },
  ];
  public static flags = {
    ...BaseCommand.flags,
    port: flags.integer({
      char: 'p',
      description: 'The port on which the server listens',
    }),
    secret: flags.string({
      char: 's',
      description: 'The secret that is used for request signatures. Omit for insecure access (default)',
    }),
    watch: flags.boolean({
      char: 'w',
      description: 'Watch for file system changes and reload code automatically',
    }),
  };

  public async run() {
    const input = this.parse(RuntimeStartCommand);
    const port = input.flags.port || DEFAULT_PORT;

    // Configure Slicknode runtime
    const runtime = new SlicknodeRuntime({
      ...(input.flags.secret ? {secret: input.flags.secret} : {}),
    });

    // Register modules in runtime
    const modules = await getModuleList(this.getProjectRoot());
    modules
      .filter((module) => module.config.runtime)
      .forEach((module) => {
        runtime.register(module.config.module.id, module.path);
      });

    // Create express app
    const app = express.default();
    app.use(bodyParser.raw({
      type: 'application/json',
    }));
    app.post('/', async (req: any, res) => {
      // If we're in watch mode, clear require cache
      if (input.flags.watch) {
        for (const key in require.cache) {
          delete require.cache[key]; // tslint:disable-line
        }
      }

      // Delegate execution to runtime
      const data = await runtime.execute(req.body.toString(), req.headers);
      return res.json(data);
    });

    // Start server
    app.listen(port, () => {
      // eslint-disable-next-line
      this.log(
        'Runtime started on port %s. Update your runtime endpoint in your Slicknode ' +
        'project to http://<public-address>:%s/.\n' +
        'To expose your machine to the internet, you can use something like ngrok',
        port,
        port,
      );
    });
  }
}
