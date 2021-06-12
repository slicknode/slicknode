import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import { waitFor } from '../waitFor';
chai.use(chaiAsPromised);

describe('waitFor util', () => {
  it('calls handler only once when resolves to true immediately', async () => {
    const handler = sinon.stub().resolves(true);
    await waitFor({
      handler,
      timeout: 1,
      interval: 1,
    });
    expect(handler.callCount).to.equal(1);
  });

  it('calls handler multiple times sequentially', async () => {
    const handler = sinon.stub().resolves(true);
    handler.onCall(0).resolves(false);
    handler.onCall(1).resolves(true);
    handler.onCall(2).resolves(false);
    await waitFor({
      handler,
      timeout: 100,
      interval: 1,
    });
    expect(handler.callCount).to.equal(2);
  });

  it('throws exception if timeout reached', async () => {
    const handler = sinon.stub().resolves(true);
    handler.onCall(0).resolves(false);
    handler.onCall(1).resolves(false);
    handler.onCall(2).resolves(false);
    await expect(
      waitFor({
        handler,
        timeout: 1,
        interval: 2,
      })
    ).to.eventually.rejectedWith('Wait timeout exceeded');
    expect(handler.callCount).to.equal(2);
  });
});
