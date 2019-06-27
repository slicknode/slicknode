import {register} from 'ts-node';

export * from '@oclif/test';
import {test as base} from '@oclif/test';
import {api} from './plugins/api';
import {login} from './plugins/login';
import {prompt} from './plugins/prompt';
import {workspaceCommand} from './plugins/workspace-command';

const test = base
  .register('api', api)
  .register('login', login)
  .register('prompt', prompt)
  .register('workspaceCommand', workspaceCommand);

export {
  test,
};
