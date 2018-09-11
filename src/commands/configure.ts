/**
 * Created by Ivo Meißner on 08.08.17.
 */

import {
  DEFAULT_API_ENDPOINT,
} from '../config';
import {
  isUrl,
} from '../validation/options';
import Command from './Command';

interface IConfigureCommandOptions {
  endpoint?: string;
}

interface IConfigureCommandArguments {}

export default class ConfigureCommand extends Command<IConfigureCommandOptions, IConfigureCommandArguments> {
  public static command = 'configure';
  public static description = 'Update local configuration of the slicknode CLI. ';
  public static options = [
    {
      name: '--endpoint <endpoint>',
      description: 'The endpoint of the Slicknode management API. "default" resets the endpoint to its default',
      validator: (value: string) => value === 'default' ? value : isUrl(value),
    },
  ];

  public async run() {
    // Update endpoint
    if (this.options.endpoint) {
      this.configStorage.setItem('endpoint', (
        this.options.endpoint === 'default' ?
          DEFAULT_API_ENDPOINT :
          this.options.endpoint
      ));
    }
  }
}
