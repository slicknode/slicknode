import nock from 'nock';
import {DEFAULT_API_ENDPOINT} from '../../src/config';
import sinon from 'sinon';
import {BaseCommand} from '../../src/base/base-command';
import Client, {MemoryStorage} from 'slicknode-client';
import {parse, print} from 'graphql';

type MockRequest = string | {
  query: string,
  variables?: {[key: string]: any},
  operationName?: string,
  authorized?: boolean,
};

export interface ResponseError {
  message: string,
  locations?: {line: number, column: number}[],
}

type MockResponse = {
  data: {[key: string]: any} | null,
  errors?: ResponseError[],
  statusCode?: number,
}

export function api(request: MockRequest, response: MockResponse) {
  const mockRequest = typeof request === 'string' ? {query: request} : request;

  const storage = new MemoryStorage();
  const DUMMY_ENDPOINT = 'http://localhost';
  const fakeClient = new Client({
    endpoint: DUMMY_ENDPOINT,
    storage,
  });
  if (mockRequest.authorized !== false) {
    fakeClient.setAuthTokenSet({
      accessToken: '123',
      accessTokenLifetime: 24000,
      refreshToken: 'sef',
      refreshTokenLifetime: 344356,
    });
  }
  // sinon.stub(fakeClient, 'fetch').returns(Promise.resolve(response));
  const stub = sinon.stub(BaseCommand.prototype, 'getClient').returns(fakeClient);
  nock(DUMMY_ENDPOINT)
    .post(() => true, (body) => {
      if (body.query !== mockRequest.query) {
        return false;
      }
      if (mockRequest.variables && JSON.stringify(mockRequest.variables) !== JSON.stringify(body.variables)) {
        return false;
      }
      if (mockRequest.operationName && body.operationName !== mockRequest.operationName) {
        return false;
      }
      return true;
    })
    .reply(200, JSON.stringify(response));

  return {
    async run(ctx: {api: number}) {
      ctx.api = ctx.api || 0;
      ctx.api++;
    },
    finally(ctx: {error?: Error, api: number}) {
      stub.called;
    },
  }
}
