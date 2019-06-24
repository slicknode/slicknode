import {expect, test} from '@oclif/test'
import ConfigStorage from '../../../src/api/ConfigStorage';

describe('config:get', () => {
  test
    .stdout()
    .stub(ConfigStorage.prototype, 'getItem', () => 'test')
    .command(['config:get', 'endpoint'])
    .it('returns the current endpoint', ctx => {
      expect(ctx.stdout).to.equal('test\n');
    });
});
