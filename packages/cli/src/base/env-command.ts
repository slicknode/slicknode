import { flags } from '@oclif/command';
import { BaseCommand } from './base-command';

export class EnvCommand extends BaseCommand {
  public static flags = {
    ...BaseCommand.flags,
    env: flags.string({
      char: 'e',
      description: 'The configured environment name',
    }),
  };
}
