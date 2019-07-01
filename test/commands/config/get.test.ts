import {expect, test} from '@oclif/test'
import ConfigStorage from '../../../src/api/config-storage';

describe('config:get', () => {
  test
    .stdout()
    .timeout(10000)
    .stub(ConfigStorage.prototype, 'getValues', () => ({endpoint: 'test'}))
    .command(['config:get', 'endpoint'])
    .it('returns the current endpoint', ctx => {
      expect(ctx.stdout).to.equal('test\n');
    });
});
