import * as sinon from 'sinon';
import { BaseCommand } from '../../src/base/base-command';
import Client, { MemoryStorage } from 'slicknode-client';

export function login() {
  return {
    async run(ctx: { _authenticatedClient: sinon.SinonStub }) {
      let stub: sinon.SinonStub;
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
      if (BaseCommand.prototype.getClient.hasOwnProperty('restore')) {
        throw new Error('getClient is already stubbed');
      }
      stub = sinon.stub(BaseCommand.prototype, 'getClient').returns(fakeClient);
      ctx._authenticatedClient = stub;
    },
    finally(ctx: { _authenticatedClient: sinon.SinonStub }) {
      if (BaseCommand.prototype.getClient.hasOwnProperty('restore')) {
        (BaseCommand.prototype.getClient as any).restore();
      }
    },
  };
}
