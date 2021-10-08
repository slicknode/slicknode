/**
 */
import chai, { expect } from 'chai';
import { it, describe, before, after } from 'mocha';
import {
  executeWithTestContext,
  destroyTestContext,
  executeQuery,
  createTestUser,
} from '../../../test/utils';
import { tenantModules } from '../../index';
import ApolloFederationModule from '../index';
import chaiAsPromised from 'chai-as-promised';
import Context from '../../../context';
import { parse } from 'graphql';
import { Role } from '../../../auth';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

describe('ApolloFederation typeExtensions', () => {
  let context: Context = null;

  before(function (done) {
    this.timeout(30000);
    executeWithTestContext([...tenantModules], (c) => {
      context = c;
      done();
      return;
      /*
      async function initData() {
        const createdInstances = await setupTestDBInstances(context);
        if (!createdInstances.length) {
          throw new Error('Could not create DB instances');
        }
      }
      initData()
        .then(done)
        .catch(done);
       */
    });
  });

  after((done) => {
    destroyTestContext(context).then(() => done());
  });

  describe('Query._service', () => {
    it('returns valid GraphQL SDL schema', async () => {
      const query = `{
        _service {
          sdl
        }
      }`;
      const result = await executeQuery(query, context);
      const sdl = result._service.sdl;
      const schema = parse(sdl);
      expect(schema.kind).to.equal('Document');
      expect(schema.definitions.length).to.be.above(1);
    });

    it('returns keys for unique fields in service definition SDL', async () => {
      const query = `{
        _service {
          sdl
        }
      }`;
      const result = await executeQuery(query, context);
      const sdl = result._service.sdl;
      expect(sdl).to.include(
        'type User implements Node & TimeStampedInterface @key(fields: "id") ' +
          '@key(fields: "email") @key(fields: "username")'
      );
      expect(sdl).to.not.include('type _Service');
    });
  });

  describe('Query._entities', () => {
    it('loads single entity via representation', async () => {
      const testUser = await createTestUser([Role.AUTHENTICATED], context);
      context.auth = testUser.auth;

      context.clearCache();

      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          {
            __typename: 'User',
            email: testUser.user.email,
          },
        ],
      });

      expect(result._entities.length).to.equal(1);
      expect(result._entities[0].email).to.equal(testUser.user.email);
      expect(result._entities[0].username).to.equal(testUser.user.username);
    }).timeout(10000);

    it('loads single entity via global ID representation', async () => {
      const testUser = await createTestUser([Role.AUTHENTICATED], context);
      context.auth = testUser.auth;

      context.clearCache();

      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          {
            __typename: 'User',
            id: context.toGlobalId('User', testUser.user.id),
          },
        ],
      });

      expect(result._entities.length).to.equal(1);
      expect(result._entities[0].email).to.equal(testUser.user.email);
      expect(result._entities[0].username).to.equal(testUser.user.username);
    }).timeout(10000);

    it('loads multiple entities via representation', async () => {
      const testUser = await createTestUser([Role.ADMIN], context);
      const testUser2 = await createTestUser([Role.AUTHENTICATED], context);
      context.auth = testUser.auth;

      context.clearCache();

      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          {
            __typename: 'User',
            email: testUser.user.email,
          },
          {
            __typename: 'User',
            email: testUser2.user.email,
          },
        ],
      });

      expect(result._entities.length).to.equal(2);
      expect(result._entities[0].email).to.equal(testUser.user.email);
      expect(result._entities[0].username).to.equal(testUser.user.username);
      expect(result._entities[1].email).to.equal(testUser2.user.email);
      expect(result._entities[1].username).to.equal(testUser2.user.username);
    }).timeout(10000);

    it('loads multiple entities via representation respecting permissions', async () => {
      const testUser = await createTestUser([Role.AUTHENTICATED], context);
      const testUser2 = await createTestUser([Role.AUTHENTICATED], context);
      context.auth = testUser.auth;

      context.clearCache();

      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          {
            __typename: 'User',
            email: testUser.user.email,
          },
          {
            __typename: 'User',
            email: testUser2.user.email,
          },
        ],
      });

      expect(result._entities.length).to.equal(2);
      expect(result._entities[0].email).to.equal(testUser.user.email);
      expect(result._entities[0].username).to.equal(testUser.user.username);
      expect(result._entities[1]).to.equal(null);
    }).timeout(10000);

    it('fails gracefully for invalid representations', async () => {
      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          true,
          false,
          123,
          'invalidstring',
          {
            __typename: 'UNKNOWNTYPE',
            id: 'sef',
          },
          {
            __typename: 'User',
            firstName: 'this does not have a loader',
          },
          {
            email: 'some stuff',
          },
        ],
      });

      expect(result._entities.length).to.equal(7);
      expect(result._entities).to.deep.equal([
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]);
    }).timeout(10000);

    it('fails gracefully for partially invalid representations', async () => {
      const testUser = await createTestUser([Role.AUTHENTICATED], context);
      context.auth = testUser.auth;

      context.clearCache();

      const query = `query Q($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ...on User {
            email
            username
            id
          }
        }
      }`;

      const result = await executeQuery(query, context, {
        representations: [
          true,
          {
            __typename: 'User',
            email: testUser.user.email,
          },
        ],
      });

      expect(result._entities.length).to.equal(2);
      expect(result._entities[0]).to.equal(null);
      expect(result._entities[1].email).to.equal(testUser.user.email);
    }).timeout(10000);
  });
});
