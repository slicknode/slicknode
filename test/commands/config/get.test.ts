import {expect, test} from '@oclif/test'
import ConfigStorage from '../../../src/api/config-storage';

describe('config:get', () => {
  // @TODO: Stubbing of default export doesn't seem to work on win, ignore for now.
  if (/^win/.test(process.platform)) {
    return;
  }

  test
    .stdout()
    .timeout(20000)
    .stub(ConfigStorage.prototype, 'getValues', () => ({endpoint: 'test'}))
    .command(['config:get', 'endpoint'])
    .it('returns the current endpoint', ctx => {
      expect(ctx.stdout).to.equal('test\n');
    });
});
