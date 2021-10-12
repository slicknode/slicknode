import { flags } from '@oclif/command';
import bodyParser from 'body-parser';
import * as express from 'express';
import { importDynamic } from '../../utils/importDynamic';
import { BaseCommand } from '../../base/base-command';
import { getModuleList } from '../../utils';

const DEFAULT_PORT = 5100;

// Export express so we can mock it in tests
export const ExpressImport = express;

export class RuntimeStartCommand extends BaseCommand {
  public static description = 'Starts a HTTP server with the Slicknode runtime';
  public static args = [];

  public static flags = {
    ...BaseCommand.flags,
    port: flags.integer({
      char: 'p',
      description: 'The port on which the server listens',
    }),
    secret: flags.string({
      char: 's',
      description:
        'The secret that is used for request signatures. Omit for insecure access (default)',
    }),
    watch: flags.boolean({
      char: 'w',
      description:
        'Watch for file system changes and reload code automatically',
    }),
  };

  public async run() {
    const input = this.parse(RuntimeStartCommand);
    const port = input.flags.port || DEFAULT_PORT;
    // We have to use dyanmic import because TS transpiles await import() into require
    const runtimeImports = await importDynamic<
      typeof import('slicknode-runtime')
    >('slicknode-runtime');
    const { SlicknodeRuntime } = runtimeImports;

    // Configure Slicknode runtime
    const runtime = new SlicknodeRuntime({
      ...(input.flags.secret ? { secret: input.flags.secret } : {}),
      watch: input.flags.watch,
    });

    // Register modules in runtime
    const projectRoot = this.getProjectRoot();
    const modules = await getModuleList(projectRoot);
    modules
      .filter((module) => module.config.runtime)
      .forEach((module) => {
        runtime.register(module.config.module.id, module.path);
      });

    // Create express app
    const app = express.default();
    app.use(
      bodyParser.raw({
        type: 'application/json',
      })
    );
    app.get('/', (req, res) => {
      res.json({
        message: 'Slicknode runtime running, ready to process events',
      });
    });
    app.post('/', async (req: any, res) => {
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
        port
      );
    });
  }
}
