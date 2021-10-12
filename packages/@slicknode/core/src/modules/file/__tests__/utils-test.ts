/**
 * Created by Ivo Meißner on 27.06.17.
 *
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
  createContextMock,
  createContextMockFromSchemaBuilder,
} from '../../../test/utils';

import { idToFileToken, fileTokenToId } from '../utils';
import SchemaBuilder from '../../../schema/builder';

describe('file utils', () => {
  describe('file token', () => {
    it('converts an ID to a token and back', () => {
      const context = createContextMock([]);
      const testId = '123';
      const token = idToFileToken(testId, context);
      expect(token.length).to.be.above(1);
      expect(token).to.not.equal(testId);

      // Convert back
      const idFromToken = fileTokenToId(token, context);
      expect(idFromToken).to.equal(testId);
    });

    it('invalidates token after expiration time', () => {
      const context = createContextMock([]);
      const testId = '123';
      const token = idToFileToken(testId, context, -1);
      expect(token.length).to.be.above(1);
      expect(token).to.not.equal(testId);

      // Convert back
      expect(() => {
        fileTokenToId(token, context);
      }).to.throw('Invalid file token');
    });

    it('generates token with project context', () => {
      const schemaBuilder = new SchemaBuilder({
        modules: [],
      });
      const context = createContextMockFromSchemaBuilder(schemaBuilder, {
        project: {
          rdbmsDatabase: {
            dbWrite: '',
            dbRead: [''],
          },
          id: 3,
          alias: 'test-alias',
          status: 'ACTIVE',
          version: {
            id: 34,
            configuration: 'sefgdr',
          },
        },
      });
      const testId = '123';
      const token = idToFileToken(testId, context, -1);
      expect(token.length).to.be.above(1);
      expect(token).to.not.equal(testId);

      // Convert back
      expect(() => {
        fileTokenToId(token, context);
      }).to.throw('Invalid file token');
    });
  });
});
