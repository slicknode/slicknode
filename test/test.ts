
export * from '@oclif/test';
import {test as base} from '@oclif/test';
import {api} from './plugins/api';
import {login} from './plugins/login';

const test = base
  .register('api', api)
  .register('login', login);

export {
  test,
};
