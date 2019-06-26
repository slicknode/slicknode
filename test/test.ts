
export * from '@oclif/test';
import {test as base} from '@oclif/test';
import {api} from './plugins/api';
import {login} from './plugins/login';
import {prompt} from './plugins/prompt';

const test = base
  .register('api', api)
  .register('login', login)
  .register('prompt', prompt);

export {
  test,
};
