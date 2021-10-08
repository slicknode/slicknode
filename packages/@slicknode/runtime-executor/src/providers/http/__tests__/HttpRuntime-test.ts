/**
 * Created by Ivo Meißner on 30.12.18
 */
import { describe, it } from 'mocha';
import { expect } from 'chai';
import HttpRuntime from '../HttpRuntime';
import * as uuid from 'uuid';
import nock from 'nock';
import crypto from 'crypto';

/* eslint-disable no-unused-expressions, @typescript-eslint/no-unused-vars */

const DUMMY_EXECUTION_CONTEXT = {
  api: {
    /**
     * The access token
     */
    accessToken: '234',
    /**
     * The GraphQL API endpoint
     */
    endpoint: 'http://localhost',
  },
  request: {
    /**
     * The IP address of the client
     */
    ip: '127.0.0.1',

    /**
     * The unique request id as UUID string
     */
    id: uuid.v1(),
  },
  project: {
    /**
     * The project alias
     */
    alias: 'test-alias',
  },
  settings: {
    boolSetting: true,
  },
  module: {
    id: '@private/runtime-test',
  },
};

describe('HttpRuntime', () => {
  it('executes code successfully', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new HttpRuntime({
      endpoint,
      secret,
    });
    const moduleId = '@private/test-module';
    const namespace = 'p3';
    const source = {
      checksum: '',
    };

    const handler = 'myHandler';
    const payload = { someData: true };
    const response = {
      data: {
        someResponse: true,
      },
    };
    const request = nock(endpoint)
      .post('/')
      .reply(function () {
        const { headers } = this.req;
        expect(headers['content-type']).to.deep.equal(['application/json']);
        expect(headers['accept']).to.deep.equal(['application/json']);
        expect(headers['x-slicknode-timestamp'][0]).to.be.string;

        // Check timestamp
        const timestamp = parseInt(headers['x-slicknode-timestamp'][0], 10);
        expect(timestamp).to.be.above(Date.now() / 1000 - 2);
        expect(timestamp).to.be.below(Date.now() / 1000 + 2);

        // Validate signature
        const signedString = [
          timestamp,
          JSON.stringify({
            module: DUMMY_EXECUTION_CONTEXT.module.id,
            handler,
            payload,
            context: DUMMY_EXECUTION_CONTEXT,
          }),
        ].join('\n');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(signedString);
        const signature = hmac.digest('hex');
        expect(headers['authorization']).to.deep.equal([
          `SN1-HMAC-SHA256 Signature=${signature}`,
        ]);

        return [200, response, {}];
      });

    const result = await runtime.execute(
      handler,
      payload,
      DUMMY_EXECUTION_CONTEXT
    );

    expect(result).to.deep.equal({
      data: response.data,
      success: true,
      message: null,
      logs: null,
      charges: [],
    });
    request.isDone();
  });

  it('returns error for non JSON response', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new HttpRuntime({
      endpoint,
      secret,
    });
    const moduleId = '@private/test-module';
    const namespace = 'p3';
    const source = {
      checksum: '',
    };

    const handler = 'myHandler';
    const payload = { someData: true };

    const request = nock(endpoint)
      .post('/')
      .reply(200, 'some invalid markup !!!');

    try {
      await runtime.execute(handler, payload, DUMMY_EXECUTION_CONTEXT);
      throw new Error('Does not throw error');
    } catch (e: any) {
      expect(e.message).to.include('Error decoding runtime response:');
    }

    request.isDone();
  });

  it('returns user error', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new HttpRuntime({
      endpoint,
      secret,
    });

    const handler = 'myHandler';
    const payload = { someData: true };
    const response = {
      data: null,
      error: {
        message: 'Custom error message',
      },
    };
    const request = nock(endpoint).post('/').reply(200, response);

    const result = await runtime.execute(
      handler,
      payload,
      DUMMY_EXECUTION_CONTEXT
    );

    expect(result).to.deep.equal({
      data: response.data,
      success: false,
      message: response.error.message,
      logs: null,
      charges: [],
    });
    request.isDone();
  });

  it('returns error for missing data object', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new HttpRuntime({
      endpoint,
      secret,
    });
    const moduleId = '@private/test-module';
    const namespace = 'p3';
    const source = {
      checksum: '',
    };

    const handler = 'myHandler';
    const payload = { someData: true };
    const response = {
      someOtherObject: null,
    };
    const request = nock(endpoint).post('/').reply(200, response);

    const result = await runtime.execute(
      handler,
      payload,
      DUMMY_EXECUTION_CONTEXT
    );

    expect(result).to.deep.equal({
      data: null,
      success: false,
      message: 'Invalid runtime response: data property is missing',
      logs: null,
      charges: [],
    });
    request.isDone();
  });

  it('handles data=false response properly', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new HttpRuntime({
      endpoint,
      secret,
    });
    const moduleId = '@private/test-module';
    const namespace = 'p3';
    const source = {
      checksum: '',
    };

    const handler = 'myHandler';
    const payload = { someData: true };
    const response = {
      data: false,
    };
    const request = nock(endpoint).post('/').reply(200, response);

    const result = await runtime.execute(
      handler,
      payload,
      DUMMY_EXECUTION_CONTEXT
    );

    expect(result).to.deep.equal({
      data: response.data,
      success: true,
      message: null,
      logs: null,
      charges: [],
    });
    request.isDone();
  });
});
