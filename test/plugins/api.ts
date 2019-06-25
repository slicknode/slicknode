import nock from 'nock';

type MockRequest = string | {
  query: string,
  variables?: {[key: string]: any},
  operationName?: string,
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

  const DUMMY_ENDPOINT = 'http://localhost';

  const interceptor = nock(DUMMY_ENDPOINT)
    .post(() => true, (body) => {
      if (body.query !== mockRequest.query) {
        console.log('Query', body.query);
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
      if (!ctx.error) {
        interceptor.done();
      }
      if (ctx.api === 0) {
        nock.cleanAll();
      }
      ctx.api--;
    },
  }
}
