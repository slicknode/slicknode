/**
 * Created by Ivo Meißner on 29.03.17.
 *
 */

import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import chaiAsPromised from 'chai-as-promised';
import schema from './contextTestSchema';
import Context from '../index';

import {
  executeWithTestContext,
  destroyTestContext,
  createContextMockFromSchemaBuilder,
} from '../../test/utils';
// import createProject from '../createProject';
import { JWT_SECRET, PROJECT_ENDPOINT } from '../../config';
import httpMocks from 'node-mocks-http';
import { getAuthContext } from '../../auth/utils';
import * as roles from '../../auth/roles';
import { HttpRuntime } from '@slicknode/runtime-executor';
import { Role } from '../../auth';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

describe('Context', () => {
  let context: Context = null;
  before((done) => {
    executeWithTestContext(schema, (c) => {
      context = c;
      done();
    });
  });

  after((done) => {
    destroyTestContext(context).then(() => done());
  });

  it('executes method in transaction', (done) => {
    async function runTest() {
      // Create an object
      const added = await context.db.TestType.create({
        test: 'Added Value',
      });
      expect(added.test).to.equal('Added Value');
      expect(added.id).to.be.string;
      const addedId = added.id;

      try {
        await context.transaction(async (trxContext) => {
          // Now update
          const updated = await trxContext.db.TestType.update(addedId, {
            test: 'Updated Value',
          });
          expect(updated.test).to.equal('Updated Value');

          // Reload
          const loaded = await trxContext.db.TestType.find({ id: addedId });
          expect(loaded).to.not.equal(null);
          expect(loaded.test).to.equal('Updated Value');

          // Now throw exception to roll back transaction
          throw Error('Something failed, roll back');
        });
        throw new Error('TransactionReference does not fail');
      } catch (e) {
        // Reload type, this should be rolled back value
        const reloaded = await context.db.TestType.find({ id: addedId });
        expect(reloaded).to.not.equal(null);
        expect(reloaded.test).to.equal('Added Value');
      }
    }
    runTest().then(done).catch(done);
  });

  it('fails when trying to nest transactions', (done) => {
    async function runTest() {
      try {
        await context.transaction(async (trxContext: Context) => {
          return await trxContext.transaction(async () => {
            return await Promise.resolve();
          });
        });
        throw new Error(
          'TransactionReference does not fail when initializing nested transaction'
        );
      } catch (e) {
        // Check if is expected error message
        expect(e.message).to.equal(
          'Nested transactions are not supported at the moment'
        );
      }
    }
    runTest().then(done).catch(done);
  });

  it('creates runtime execution context', () => {
    const runtimeContext = context.getRuntimeExecutionContext('core');
    expect(runtimeContext.api.accessToken).to.be.string;
    expect(runtimeContext.api.endpoint).to.equal(
      PROJECT_ENDPOINT.split('{alias}').join('_root')
    );

    // Validate accessToken
    const req = httpMocks.createRequest!({
      headers: {
        host: 'localhost:3000',
        authorization: `Bearer ${runtimeContext.api.accessToken}`,
      },
    });
    const authContext = getAuthContext(req, null, context.jwtSecret);

    // Ensure the auth context is added and runtime role is added
    expect(authContext).to.deep.equal({
      ...context.auth,
      roles: [...context.auth.roles, Role.RUNTIME],
    });
  });

  it('creates runtime execution with logged in user', () => {
    const testContext = createContextMockFromSchemaBuilder(
      context.schemaBuilder,
      {
        moduleSettings: {
          [schema[schema.length - 1].id]: {
            string: 'testsetting',
            intRequired: 123,
          },
        },
      }
    );
    testContext.auth = {
      uid: '2',
      write: true,
      roles: [Role.ANONYMOUS, Role.ADMIN, Role.AUTHENTICATED],
    };

    const runtimeContext = testContext.getRuntimeExecutionContext('core');
    expect(runtimeContext.api.accessToken).to.be.string;
    expect(runtimeContext.api.endpoint).to.equal(
      PROJECT_ENDPOINT.split('{alias}').join('_root')
    );

    // Validate accessToken
    const req = httpMocks.createRequest!({
      headers: {
        host: 'localhost:3000',
        authorization: `Bearer ${runtimeContext.api.accessToken}`,
      },
    });
    const authContext = getAuthContext(req, null, testContext.jwtSecret);

    // Ensure the auth context is added and runtime role is added
    expect(authContext).to.deep.equal({
      ...testContext.auth,
      roles: [...testContext.auth.roles, Role.RUNTIME],
    });
  });

  it('caches runtime execution context', () => {
    const runtimeContext = context.getRuntimeExecutionContext('core');
    const runtimeContext2 = context.getRuntimeExecutionContext('core');
    expect(runtimeContext).to.equal(runtimeContext2);
  });

  it('adds module settings to runtime execution context', () => {
    const moduleId = schema[schema.length - 1].id;
    const settings = {
      string: 'testsetting',
      intRequired: 123,
    };
    const testContext = createContextMockFromSchemaBuilder(
      context.schemaBuilder,
      {
        moduleSettings: {
          [moduleId]: settings,
        },
      }
    );
    const runtimeContext = testContext.getRuntimeExecutionContext(moduleId);
    expect(runtimeContext.settings).to.equal(settings);

    const coreContext = testContext.getRuntimeExecutionContext('core');
    expect(coreContext.settings).to.deep.equal({});
  });

  it('uses defaultRuntime from context options', async () => {
    const req = httpMocks.createRequest!({
      headers: {
        host: 'localhost:3000',
      },
    });
    const res = httpMocks.createResponse();

    // Add dummy translator
    res.__ = (text) => text;

    const defaultRuntime = new HttpRuntime({
      endpoint: 'http://localhost',
      secret: 'Somesecret',
    });
    const testContext = new Context({
      res,
      req,
      jwtSecret: JWT_SECRET,
      schemaBuilder: context.schemaBuilder,
      defaultRuntime,
    });

    expect(await testContext.getRuntime('someID')).to.equal(defaultRuntime);
  });
});
