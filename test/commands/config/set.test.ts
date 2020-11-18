import {expect, test} from '@oclif/test'
import ConfigStorage from '../../../src/api/config-storage';
import sinon, {SinonStub} from 'sinon';

describe('config:set', () => {
  // @TODO: Stubbing of default export doesn't seem to work on win, ignore for now.
  if (/^win/.test(process.platform)) {
    return;
  }

  const TEST_URL = 'https://localhost';
  test
    .stdout()
    .timeout(20000)
    .stub(ConfigStorage.prototype, 'setValues', sinon.stub())
    .command(['config:set', 'endpoint', TEST_URL])
    .it('sets the endpoint', ctx => {
      expect(ctx.stdout).to.equal('');
      const stub = ConfigStorage.prototype.setValues as SinonStub;
      expect(stub.called).to.equal(true);
      expect(stub.firstCall.args[0].endpoint).to.equal(TEST_URL);
    });
});
