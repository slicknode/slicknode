import {expect, test} from '@oclif/test'
import ConfigStorage from '../../../src/api/config-storage';
import sinon, {SinonSpy} from 'sinon';

describe('config:set', () => {
  const TEST_URL = 'https://localhost';
  test
    .stdout()
    .stub(ConfigStorage.prototype, 'setItem', sinon.stub().returns('test'))
    .command(['config:set', 'endpoint', TEST_URL])
    .it('sets the endpoint', ctx => {
      expect(ctx.stdout).to.equal('');
      sinon.assert.calledWith(ConfigStorage.prototype.setItem as SinonSpy, 'endpoint', TEST_URL);
    });
});
