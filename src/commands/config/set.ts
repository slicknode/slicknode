import { BaseCommand } from '../../base/base-command';

export default class ConfigSet extends BaseCommand {
  public static description = 'Sets the configuration value for a setting';

  public static examples = [
    `$ slicknode config:set NAME VALUE
`,
  ];

  public static args = [
    {
      name: 'name',
      required: true,
      options: ['endpoint'],
    },
    {
      name: 'value',
      required: true,
    },
  ];

  public async run() {
    const { args } = this.parse(ConfigSet);
    this.getConfigStorage().setItem(args.name, args.value);
  }
}
