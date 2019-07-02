import {BaseCommand} from '../../base/base-command';

export default class ConfigGet extends BaseCommand {
  public static description = 'Returns the configuration value for a setting';

  public static examples = [
    `$ slicknode config:get endpoint
`,
  ];

  public static args = [{
    name: 'name',
    required: true,
    options: [ 'endpoint' ],
  }];

  public async run() {
    const {args} = this.parse(ConfigGet);
    const value = this.getConfigStorage().getItem(args.name);
    this.log(value || '');
  }
}
