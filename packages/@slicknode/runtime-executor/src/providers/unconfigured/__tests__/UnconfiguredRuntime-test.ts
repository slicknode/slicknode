/**
 * Created by Ivo Meißner on 30.12.18
 */
import { describe, it } from 'mocha';
import { expect } from 'chai';
import UnconfiguredRuntime from '../UnconfiguredRuntime';
import * as uuid from 'uuid';

/* eslint-disable no-unused-expressions */

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
  module: {
    id: '@private/test-module',
  },
  settings: {
    boolSetting: true,
  },
};

describe('UnconfiguredRuntime', () => {
  it('executes code successfully', async () => {
    expect(1).to.equal(1);
    const endpoint = 'http://localhost';
    const secret = 'mysecret';
    const runtime = new UnconfiguredRuntime({
      endpoint,
      secret,
    });

    const handler = 'myHandler';
    const payload = { someData: true };

    const result = await runtime.execute(
      handler,
      payload,
      DUMMY_EXECUTION_CONTEXT
    );

    expect(result).to.deep.equal({
      data: null,
      success: false,
      message:
        'Runtime is not configured. Add the URL to your custom runtime endpoint in the project settings.',
      logs: null,
      charges: [],
    });
  });
});
