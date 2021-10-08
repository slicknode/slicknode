import { BaseCommand } from '../base/base-command';

export default class LoginCommand extends BaseCommand {
  public static command = 'login';
  public static description = 'Login to a slicknode account / change user';

  public async run() {
    const client = await this.getClient();
    client.logout();

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    await this.authenticate();
  }
}
