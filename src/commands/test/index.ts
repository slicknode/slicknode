import {Command, flags} from '@oclif/command';

export default class Hello extends Command {
  public static description = 'describe the command here';

  public static examples = [
    `$ slicknode hello
hello world from ./src/hello.ts!
`,
  ];

  public static flags = {
    help: flags.help({char: 'h'}),
    // flag with a value (-n, --name=VALUE)
    name: flags.string({char: 'n', description: 'name to print'}),
    // flag with no value (-f, --force)
    force: flags.boolean({char: 'f'}),
  };

  public static args = [{name: 'file'}];

  public async run() {
    const {args, flags} = this.parse(Hello);

    const name = flags.name || 'world';
    this.log(`hello ${name} from ./src/commands/test.ts`);
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`);
    }
  }
}
