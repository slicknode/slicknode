export * from '@oclif/test';
import {test as base} from '@oclif/test';
import {api} from './plugins/api';

const test = base.register('api', api);

export {
  test,
};
