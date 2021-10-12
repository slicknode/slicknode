/**
 * Created by Ivo Meißner on 18.01.18.
 *
 */
/* eslint-disable no-unused-expressions, no-unused-vars */

import { expect } from 'chai';
import * as uuid from 'uuid';
import { config } from 'dotenv';
import * as path from 'path';
config();

import { RuntimeInterface } from '../../types';
import { NodeRuntime } from '../node';

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
    id: 'basic',
  },
};

describe('Slicknode Runtime', () => {
  describe('NodeRuntime', () => {
    let runtime: RuntimeInterface;

    before(async () => {
      const moduleId = 'basic';
      runtime = new NodeRuntime({
        modules: [
          {
            moduleId,
            modulePath: path.resolve(__dirname, './testmodules/basic'),
          },
        ],
        watch: false,
      });
    });

    it('Creates and runs ESM module successfully', function (done) {
      this.timeout(180000);
      async function runTest() {
        const result = await runtime.execute(
          'src/esm-sync-module.js',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(true);
        expect(result.data).to.equal('Hello world');
      }
      runTest().then(done).catch(done);
    });

    it('Creates and runs ESM async module successfully', function (done) {
      this.timeout(180000);
      async function runTest() {
        const result = await runtime.execute(
          'src/esm-async-module.js',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(true);
        expect(result.data).to.equal('Hello world');
      }
      runTest().then(done).catch(done);
    });

    it('Creates and runs bundle successfully', function (done) {
      this.timeout(180000);
      async function runTest() {
        const result = await runtime.execute(
          'src/hello-world.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(true);
        expect(result.data).to.equal('Hello world');
      }
      runTest().then(done).catch(done);
    });

    it('throws exception from user code', (done) => {
      async function runTest() {
        const result = await runtime.execute(
          'src/exception.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(false);
        expect(result.data).to.equal(null);
        expect(result.message).to.equal('User error message');
      }
      runTest().then(done).catch(done);
    });

    it('throws exception from user code async handler', (done) => {
      async function runTest() {
        const result = await runtime.execute(
          'src/async-exception.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(false);
        expect(result.data).to.equal(null);
        expect(result.message).to.equal('User error message');
      }
      runTest().then(done).catch(done);
    });

    it('handles syntax error in user code', (done) => {
      async function runTest() {
        const result = await runtime.execute(
          'src/syntax-error.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.success).to.equal(false);
        expect(result.data).to.equal(null);
        expect(result.message).to.equal(
          'Error loading handler "src/syntax-error.cjs": Invalid or unexpected token'
        );
      }
      runTest().then(done).catch(done);
    });

    it('passes context to handler', (done) => {
      async function runTest() {
        const result = await runtime.execute(
          'src/return-context.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(DUMMY_EXECUTION_CONTEXT);
      }
      runTest().then(done).catch(done);
    });

    it('passes event object to handler', (done) => {
      async function runTest() {
        const event = { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' };
        const result = await runtime.execute(
          'src/return-event.cjs',
          event,
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(event);
      }
      runTest().then(done).catch(done);
    });

    it('passes event boolean value to handler', (done) => {
      async function runTest() {
        const event = true;
        const result = await runtime.execute(
          'src/return-event.cjs',
          event,
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(event);
      }
      runTest().then(done).catch(done);
    });

    it('passes event null value to handler', (done) => {
      async function runTest() {
        const event = null;
        const result = await runtime.execute(
          'src/return-event.cjs',
          event,
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(event);
      }
      runTest().then(done).catch(done);
    });

    it('runs npm modules successfully', (done) => {
      async function runTest() {
        const event = null;
        const result = await runtime.execute(
          'src/npm-module.cjs',
          event,
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(3);
      }
      runTest().then(done).catch(done);
    });

    it('works with relative imports', (done) => {
      async function runTest() {
        const result = await runtime.execute(
          'src/relative-import.cjs',
          { key: 'value some crazy characters:"§/(&%(\'\\§/$%&' },
          DUMMY_EXECUTION_CONTEXT
        );

        expect(result.message).to.equal(null);
        expect(result.success).to.equal(true);
        expect(result.data).to.deep.equal(DUMMY_EXECUTION_CONTEXT);
      }
      runTest().then(done).catch(done);
    });
  });
});
