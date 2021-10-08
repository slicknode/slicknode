import * as sinon from 'sinon';
import * as ClientModule from '../../src/utils/getClient';
import { ImportMock } from 'ts-mock-imports';
import { MemoryStorage, Client } from '@slicknode/client-node';

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
      sinon.stub(fakeClient, 'logout').callsFake(async () => {
        storage.clear();
      });
      stub = sinon.mock().callsFake(async () => {
        return fakeClient;
      });

      ctx._authenticatedClient = ImportMock.mockFunction(
        ClientModule,
        'getClient',
        Promise.resolve(fakeClient)
      );
    },
    finally(ctx: { _authenticatedClient: sinon.SinonStub }) {
      ImportMock.restore();
    },
  };
}
