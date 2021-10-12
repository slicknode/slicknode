import chai, { expect } from 'chai';
import { describe, it } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import { loadProjectRootConfig } from '../loadProjectRootConfig';
import * as path from 'path';
chai.use(chaiAsPromised);

describe('loadProjectRootConfig', () => {
  it('throws error for invalid path', async () => {
    return expect(
      loadProjectRootConfig('./some-unknown-path.yml')
    ).to.eventually.rejectedWith('no such file or directory');
  });

  it('throws error for invalid config', async () => {
    return expect(
      loadProjectRootConfig(
        path.join(__dirname, './fixtures/invalidProject/slicknode.yml')
      )
    ).to.eventually.rejectedWith('"dependencies.INVALIDID" is not allowed');
  });

  it('returns valid config', async () => {
    const result = await loadProjectRootConfig(
      path.join(__dirname, './fixtures/simpleProject/slicknode.yml')
    );
    expect(result).to.deep.equal({
      dependencies: {
        auth: 'latest',
        core: 'latest',
        relay: 'latest',
      },
    });
  });
});
