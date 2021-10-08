import { describe, it } from 'mocha';
import { createContextMock, destroyTestContext } from '../../../../test/utils';
import { expect } from 'chai';
import mockKnex from 'mock-knex';
import {
  AuthModule,
  Context,
  CoreModule,
  loadModuleConfig,
  RelayModule,
} from '../../../../index';
import path from 'path';

describe('PostgresHandler', () => {
  describe('upsert', () => {
    let context: Context;
    let tracker;
    beforeEach(async () => {
      context = createContextMock([
        CoreModule,
        AuthModule,
        RelayModule,
        await loadModuleConfig(path.join(__dirname, 'testmodules', 'blog')),
      ]);
      mockKnex.mock(context.getDBWrite());
      tracker = mockKnex.getTracker();
      tracker.install();
    });
    afterEach(async () => {
      tracker.uninstall();
      mockKnex.unmock(context.getDBWrite());
    });
    it('inserts object', async () => {
      tracker.on('query', (query) => {
        expect(query.sql).to.equal(
          `insert into "n_blog__post" ("unique_string","unique_int") values ($1,$2) on conflict ("unique_string") where "unique_string" is not null do update set "unique_string" = $3, "unique_int" = $4 returning (jsonb_build_object('id', "id", 'string', "string", 'unique_string', "unique_string", 'int', "int", 'unique_int', "unique_int", 'published_at', "published_at")) as data`
        );
        query.response({
          rows: [
            {
              data: {
                id: '12',
                unique_string: 'Test',
                string: null,
                int: 34,
                unique_int: 34,
                published_at: null,
              },
            },
          ],
        });
      });
      const result = await context.db.Blog_Post.upsert({
        uniqueString: 'Test',
        uniqueInt: 34,
      });
      expect(result).to.deep.equal({
        id: '12',
        string: null,
        uniqueString: 'Test',
        int: 34,
        uniqueInt: 34,
        publishedAt: null,
        __typename: 'Blog_Post',
      });
    });
  });

  describe('getBatchLoader', () => {
    let context: Context;
    let tracker;
    beforeEach(async () => {
      context = createContextMock([
        CoreModule,
        AuthModule,
        RelayModule,
        await loadModuleConfig(path.join(__dirname, 'testmodules', 'blog')),
      ]);
      mockKnex.mock(context.getDBWrite());
      tracker = mockKnex.getTracker();
      tracker.install();
    });
    afterEach(async () => {
      tracker.uninstall();
      mockKnex.unmock(context.getDBWrite());
    });
    it('batches select queries', async () => {
      tracker.on('query', (query) => {
        expect(query.sql).to.equal(
          'select (select json_agg(d) from (select * from "n_blog__post" where "id" in ($1::bigint)) d) as q0,(select json_agg(d) from (select * from "n_user" where "id" in ($2::bigint) and FALSE) d) as q1'
        );
        query.response({
          rows: [
            {
              q0: [
                {
                  id: '12',
                  unique_string: 'Test',
                  string: null,
                  int: 34,
                  unique_int: 34,
                  published_at: '1970-01-01T00:00:00.000Z',
                },
              ],
              q1: [],
            },
          ],
        });
      });
      const [post, user] = await Promise.all([
        context.getLoader('Blog_Post').load(12),
        context.getLoader('User').load(1),
      ]);

      expect(post).to.deep.equal({
        id: '12',
        string: null,
        uniqueString: 'Test',
        int: 34,
        uniqueInt: 34,
        publishedAt: new Date(0),
        __typename: 'Blog_Post',
      });
      expect(user).to.null;
    });
  });
});
