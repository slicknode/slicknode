import nock from 'nock';

type MockRequest =
  | string
  | {
      query: string;
      variables?: { [key: string]: any };
      operationName?: string;
    };

export interface ResponseError {
  message: string;
  locations?: { line: number; column: number }[];
}

type MockResponse = {
  data: { [key: string]: any } | null;
  errors?: ResponseError[];
  statusCode?: number;
};
function hexToString(hex: string) {
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return str;
}

export function api(request: MockRequest, response: MockResponse) {
  return {
    async run(ctx: { apiMocks?: nock.Scope[] }) {
      const mockRequest =
        typeof request === 'string' ? { query: request } : request;

      const DUMMY_ENDPOINT = 'http://localhost';
      ctx.apiMocks = ctx.apiMocks || [];

      const interceptor = nock(DUMMY_ENDPOINT)
        .post(
          () => true,
          (body) => {
            // We have multipart request
            if (typeof body === 'string') {
              const content = hexToString(body.toString());
              if (!content.includes(mockRequest.query)) {
                return false;
              }
              if (
                mockRequest.variables &&
                !content.includes(JSON.stringify(mockRequest.variables))
              ) {
                return false;
              }
              if (
                mockRequest.operationName &&
                !content.includes(JSON.stringify(mockRequest.operationName))
              ) {
                return false;
              }
              return true;
            }

            if (body.query !== mockRequest.query) {
              return false;
            }
            if (
              mockRequest.variables &&
              JSON.stringify(mockRequest.variables) !==
                JSON.stringify(body.variables)
            ) {
              return false;
            }
            if (
              mockRequest.operationName &&
              body.operationName !== mockRequest.operationName
            ) {
              return false;
            }
            return true;
          }
        )
        .reply(200, JSON.stringify(response));
      ctx.apiMocks.push(interceptor);
    },
    finally(ctx: { error?: Error; apiMocks?: nock.Scope[] }) {
      if (!ctx.error && ctx.apiMocks) {
        // interceptor.done();
        ctx.apiMocks.forEach((interceptor) => interceptor.done());
      }
    },
  };
}
