/**
 * Mostly copied from https://github.com/oclif/command but adds support for space separated commands
 */
import {Command} from '@oclif/command';
import * as Config from '@oclif/config';
import {SlicknodeHelp} from './help';

export class Main extends Command {
  public static run(argv = process.argv.slice(2), options?: Config.LoadOptions) {
    return super.run(
      argv,
      options || module.parent && module.parent.parent && module.parent.parent.filename || __dirname,
    );
  }

  public async init() {
    const [id, ...argv] = this.argv;
    await this.config.runHook('init', {id, argv});
    return super.init();
  }

  public async run() {
    // Find first flag
    const flagIndex = this.argv.findIndex((arg) => arg.startsWith('-'));

    const potentialArgs = this.argv.slice(0, flagIndex !== -1 ? flagIndex : this.argv.length);
    this.parse({'strict': false, '--': false, ...this.ctor as any});

    for (let idx = potentialArgs.length; idx > 0; idx--) {
      const id = potentialArgs.slice(0, idx).join(':');
      if (this.config.findCommand(id)) {
        return await this.config.runCommand(id, this.argv.slice(idx));
      }
      const topic = this.config.findTopic(id);
      if (topic) {
        return this._help();
      }
    }

    await this.config.runCommand(potentialArgs.join(' '), this.argv.slice(potentialArgs.length));
  }

  protected _helpOverride(): boolean {
    if (['-v', '--version', 'version'].includes(this.argv[0])) { return this._version() as any; }
    if (['-h', 'help'].includes(this.argv[0])) { return true; }
    if (this.argv.length === 0) { return true; }
    for (const arg of this.argv) {
      if (arg === '--help') { return true; }
      if (arg === '--') { return false; }
    }
    return false;
  }

  protected _help() {
    const help = new SlicknodeHelp(this.config);
    help.showHelp(this.argv);
    return this.exit(0);
  }
}

export function run(argv = process.argv.slice(2), options?: Config.LoadOptions) {
  return Main.run(argv, options);
}
