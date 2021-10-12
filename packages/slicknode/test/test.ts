// import { register } from 'ts-node';

export * from '@oclif/test';
import { test as base } from '@oclif/test';
import { api } from './plugins/api';
import { login } from './plugins/login';
import { prompt } from './plugins/prompt';
import { tmpdir } from './plugins/tmpdir';
import { workspaceCommand } from './plugins/workspace-command';
import { tmpExpress } from './plugins/tmpExpress';
import { cliActions } from './plugins/cli-actions';

export const test = base
  .register('api', api)
  .register('cliActions', cliActions)
  .register('login', login)
  .register('prompt', prompt)
  .register('tmpdir', tmpdir)
  .register('tmpExpress', tmpExpress)
  .register('workspaceCommand', workspaceCommand);
