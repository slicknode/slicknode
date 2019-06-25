import sinon, {SinonStub} from 'sinon';
import {BaseCommand} from '../../src/base/base-command';
import Client, {MemoryStorage} from 'slicknode-client';

export function login() {
  const storage = new MemoryStorage();
  const DUMMY_ENDPOINT = 'http://localhost';
  const fakeClient = new Client({
    endpoint: DUMMY_ENDPOINT,
    storage,
  });

  fakeClient.setAuthTokenSet({
    accessToken: '123',
    accessTokenLifetime: 24000,
    refreshToken: 'sef',
    refreshTokenLifetime: 344356,
  });
  let stub: SinonStub;
  if (!BaseCommand.prototype.getClient.hasOwnProperty('restore')) {
    stub = sinon.stub(BaseCommand.prototype, 'getClient').returns(fakeClient);
  }

  return {
    async run(ctx: {login: number}) {
      ctx.login = ctx.login || 0;
      ctx.login++;
    },
    finally(ctx: {error?: Error, login: number}) {
      if (stub && ctx.login === 0) {
        stub.restore();
      }
      ctx.login--;
    },
  }
}
