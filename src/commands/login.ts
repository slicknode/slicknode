/**
 * Created by Ivo Meißner on 04.08.17.
 *
 * @flow
 */

import Command from './Command';

interface ILoginCommandOptions {}
interface ILoginCommandArguments {}

export default class LoginCommand extends Command<ILoginCommandOptions, ILoginCommandArguments> {
  public static command = 'login';
  public static description = 'Login to a slicknode account / change user';
  public async run() {
    this.client.logout();

    // Check for version updates
    if (await this.updateRequired()) {
      return;
    }

    await this.authenticate();
  }
}
