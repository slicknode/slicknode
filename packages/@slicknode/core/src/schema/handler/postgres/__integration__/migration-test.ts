/**
 * Created by Ivo Meißner on 23.01.19
 *
 */
import { expect } from 'chai';
import { it, describe } from 'mocha';
import {
  createTestContext,
  destroyTestContext,
  migrateTestContext,
  buildModules,
  executeQuery,
} from '../../../../test/utils';
import { ModuleConfig } from '../../../../definition';
import path from 'path';
import Context from '../../../../context';

/* eslint-disable no-unused-expressions */

describe('Postgres migration test', () => {
  describe('Content nodes', () => {
    it('removes union type with field properly', async () => {
      let context = await createTestContext(
        await getModules('content-node-remove-union-1')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-remove-union-2')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-remove-union-1')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-remove-union-1')
      );

      await destroyTestContext(context);
    });

    it('creates / updates content nodes', async () => {
      let context = await createTestContext(
        await getModules('content-node-change-required-1')
      );

      // Create base
      const { locale, status } = await getContentBaseTypes(context);

      // Create content node
      const contentNode = await context.db.ContentNode.create({
        type: 'Test_Test',
      });

      // Create Test_Test object in preview table
      const createdNode = await context.db.Test_Test.create(
        {
          contentNode: contentNode.id,
          deletedContentRequired: contentNode.id,
          deletedListContentRequired: [contentNode.id],
          deletedUnionRequired: contentNode.id,
          deletedListUnionRequired: [contentNode.id],
          locale: locale.id,
          status: status.id,
          createdAt: new Date(),
          test: 'Preview',
        },
        {
          preview: true,
        }
      );

      // Reload from preview
      const loadedNode = await context.db.Test_Test.find(
        {
          id: createdNode.id,
        },
        {
          preview: true,
        }
      );
      expect(loadedNode.test).to.equal('Preview');

      // Load from published
      const loadPublishedNode = await context.db.Test_Test.find({
        id: createdNode.id,
      });
      expect(loadPublishedNode).to.equal(null);

      // Create non preview node
      const publishedNode = await context.db.Test_Test.create(
        {
          contentNode: contentNode.id,
          deletedContentRequired: contentNode.id,
          deletedListContentRequired: [contentNode.id],
          deletedUnionRequired: contentNode.id,
          deletedListUnionRequired: [contentNode.id],
          locale: locale.id,
          status: status.id,
          createdAt: new Date(),
          test: 'Published',
        },
        {
          preview: false,
        }
      );
      const loadPublishedNode2 = await context.db.Test_Test.find({
        id: createdNode.id,
      });
      expect(loadPublishedNode2.test).to.equal('Published');

      // Preview node is still saved
      const previewNode = await context.db.Test_Test.find(
        {
          id: createdNode.id,
        },
        {
          preview: true,
        }
      );
      expect(previewNode.test).to.equal('Preview');

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-2')
      );
      await destroyTestContext(context);
    });

    it('creates / updates content nodes with schema', async () => {
      let context = await createTestContext(
        await getModules('content-node-change-required-1'),
        {
          dbSchemaName: 'p1',
        }
      );

      // Create base
      const { locale, status } = await getContentBaseTypes(context);

      // Create content node
      const contentNode = await context.db.ContentNode.create({
        type: 'Test_Test',
      });

      // Create Test_Test object in preview table
      const createdNode = await context.db.Test_Test.create(
        {
          contentNode: contentNode.id,
          deletedContentRequired: contentNode.id,
          deletedListContentRequired: [contentNode.id],
          deletedUnionRequired: contentNode.id,
          deletedListUnionRequired: [contentNode.id],
          locale: locale.id,
          status: status.id,
          createdAt: new Date(),
          test: 'Preview',
        },
        {
          preview: true,
        }
      );

      // Reload from preview
      const loadedNode = await context.db.Test_Test.find(
        {
          id: createdNode.id,
        },
        {
          preview: true,
        }
      );
      expect(loadedNode.test).to.equal('Preview');

      // Load from published
      const loadPublishedNode = await context.db.Test_Test.find({
        id: createdNode.id,
      });
      expect(loadPublishedNode).to.equal(null);

      // Create non preview node
      const publishedNode = await context.db.Test_Test.create(
        {
          contentNode: contentNode.id,
          deletedContentRequired: contentNode.id,
          deletedListContentRequired: [contentNode.id],
          deletedUnionRequired: contentNode.id,
          deletedListUnionRequired: [contentNode.id],
          locale: locale.id,
          status: status.id,
          createdAt: new Date(),
          test: 'Published',
        },
        {
          preview: false,
        }
      );
      const loadPublishedNode2 = await context.db.Test_Test.find({
        id: createdNode.id,
      });
      expect(loadPublishedNode2.test).to.equal('Published');

      // Preview node is still saved
      const previewNode = await context.db.Test_Test.find(
        {
          id: createdNode.id,
        },
        {
          preview: true,
        }
      );
      expect(previewNode.test).to.equal('Preview');

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-2')
      );
      await destroyTestContext(context);
    });

    it('deletes and updates types properly', async () => {
      let context = await createTestContext(
        await getModules('content-node-change-required-1')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-2')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-1')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-1')
      );
      await destroyTestContext(context);
    });

    it('deletes and updates types properly with schema', async () => {
      let context = await createTestContext(
        await getModules('content-node-change-required-1'),
        {
          dbSchemaName: 'p1',
        }
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-2')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-1')
      );

      await migrateTestContext(
        context,
        await getModules('content-node-change-required-1')
      );

      await destroyTestContext(context);
    });
  });

  describe('Object Type', () => {
    it('changes non null status of related node', async () => {
      let context = await createTestContext(
        await getModules('object-type-change-required-1')
      );
      const query = `mutation {
        create: Test_createConnected(input: {name: "Test"}) {
          node {
            id
          }
        }
      }`;

      // Can perform basic read operations
      const result = await executeQuery(query, context);
      expect(result.create.node.id).to.be.string;

      // Add required field to relation
      context = await migrateTestContext(
        context,
        await getModules('object-type-change-required-2')
      );

      // Remove required constraint
      context = await migrateTestContext(
        context,
        await getModules('object-type-change-required-3')
      );

      await destroyTestContext(context);
    });

    it('adds / updates autocomplete indexes', async () => {
      let context = await createTestContext(
        await getModules('autocomplete-fields-1')
      );

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
      });

      const autoCompleteQuery = `query Q($query: String!) {
        test: Test_listTest(filter: {node: {_autocomplete: $query}}) {
          edges {
            node {
              string
            }
          }
        }
      }`;

      // Check if we can query with autocomplete
      const result = await executeQuery(autoCompleteQuery, context, {
        query: 'OME',
      });
      expect(result.test.edges[0].node.string).to.equal('Some string');

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('autocomplete-fields-2')
      );

      await context.db.Test_AddIndex.create({
        name: 'Some text',
      });
      const result2 = await executeQuery(
        `query Q($query: String!) {
        test: Test_listAddIndex(filter: {node: {_autocomplete: $query}}) {
          edges {
            node {
              name
            }
          }
        }
      }`,
        context,
        {
          query: 'OME',
        }
      );
      expect(result2.test.edges[0].node.name).to.equal('Some text');

      // Can migrate back
      context = await migrateTestContext(
        context,
        await getModules('autocomplete-fields-1')
      );
      await destroyTestContext(context);
    }).timeout(10000);

    it('adds / updates composite indexes', async () => {
      let context = await createTestContext(
        await getModules('composite-index-1')
      );

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
      });

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('composite-index-2')
      );

      // Can migrate back
      context = await migrateTestContext(
        context,
        await getModules('composite-index-1')
      );
      context = await migrateTestContext(
        context,
        await getModules('composite-index-2')
      );

      await destroyTestContext(context);
    });

    it('adds / updates composite unique indexes', async () => {
      let context = await createTestContext(
        await getModules('composite-unique-index-1')
      );

      // Create connected type
      const connected = await context.db.Test_Connected.create({
        name: 'test',
      });

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
        connected: connected.id,
      });

      // Cannot add another one bcs. of unique violation
      try {
        await context.db.Test_Test.create({
          string: 'Some string',
          description: 'Description yo',
          connected: connected.id,
        });
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('handler.postgres.errors.unique');
      }

      // Other unique combination is possible
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
      });

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      // NULL values from previous inserts are considered not equal
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
        boolean: false,
      });
      try {
        await context.db.Test_Test.create({
          connected: connected.id,
          string: 'Some other string',
          description: 'Description yo',
          boolean: false,
        });
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('handler.postgres.errors.unique');
      }

      // Add same values, but add boolean (which was added to unique index)
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
        boolean: true,
      });

      // Migration fails bcs. of unique values
      try {
        context = await migrateTestContext(
          context,
          await getModules('composite-unique-index-1')
        );
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('could not create unique index');
      }

      // Delete all rows and succeed afterwards
      await context.db.Test_Test.delete(() => {});
      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-1')
      );

      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      await destroyTestContext(context);
    });

    it('removes composite unique indexes', async () => {
      let context = await createTestContext(
        await getModules('composite-unique-index-1')
      );

      // Create connected type
      let node = await context.db.Test_CompositeUnique.create({
        name: 'test',
        key: '1',
      });

      // Make sure unique index was added
      try {
        node = await context.db.Test_CompositeUnique.create({
          name: 'test',
          key: '1',
        });
        throw new Error('Exception not thrown');
      } catch (e) {
        expect(e.message).to.include('Unique constraint');
      }

      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      // Check if unique constraint was removed and we can now add things
      node = await context.db.Test_CompositeUnique.create({
        name: 'test',
        key: '1',
      });
      const nodes = await context.db.Test_CompositeUnique.fetchAll();
      expect(nodes.length).to.equal(2);

      await destroyTestContext(context);
    });

    it('changes non null status of related node in project schema', async () => {
      let context = await createTestContext(
        await getModules('object-type-change-required-1'),
        { dbSchemaName: 'test' }
      );
      const query = `mutation {
        create: Test_createConnected(input: {name: "Test"}) {
          node {
            id
          }
        }
      }`;

      // Can perform basic read operations
      const result = await executeQuery(query, context);
      expect(result.create.node.id).to.be.string;

      // Add required field to relation
      context = await migrateTestContext(
        context,
        await getModules('object-type-change-required-2')
      );

      // Remove required constraint
      context = await migrateTestContext(
        context,
        await getModules('object-type-change-required-3')
      );

      await destroyTestContext(context);
    });

    it('adds / updates autocomplete indexes in project schema', async () => {
      let context = await createTestContext(
        await getModules('autocomplete-fields-1'),
        { dbSchemaName: 'test' }
      );

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
      });

      const autoCompleteQuery = `query Q($query: String!) {
        test: Test_listTest(filter: {node: {_autocomplete: $query}}) {
          edges {
            node {
              string
            }
          }
        }
      }`;

      // Check if we can query with autocomplete
      const result = await executeQuery(autoCompleteQuery, context, {
        query: 'OME',
      });
      expect(result.test.edges[0].node.string).to.equal('Some string');

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('autocomplete-fields-2')
      );

      await context.db.Test_AddIndex.create({
        name: 'Some text',
      });
      const result2 = await executeQuery(
        `query Q($query: String!) {
        test: Test_listAddIndex(filter: {node: {_autocomplete: $query}}) {
          edges {
            node {
              name
            }
          }
        }
      }`,
        context,
        {
          query: 'OME',
        }
      );
      expect(result2.test.edges[0].node.name).to.equal('Some text');

      // Can migrate back
      context = await migrateTestContext(
        context,
        await getModules('autocomplete-fields-1')
      );
      await destroyTestContext(context);
    }).timeout(10000);

    it('adds / updates composite indexes in project schema', async () => {
      let context = await createTestContext(
        await getModules('composite-index-1'),
        { dbSchemaName: 'test' }
      );

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
      });

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('composite-index-2')
      );

      // Can migrate back
      context = await migrateTestContext(
        context,
        await getModules('composite-index-1')
      );
      context = await migrateTestContext(
        context,
        await getModules('composite-index-2')
      );

      await destroyTestContext(context);
    });

    it('adds / updates composite unique indexes in project schema', async () => {
      let context = await createTestContext(
        await getModules('composite-unique-index-1'),
        { dbSchemaName: 'test' }
      );

      // Create connected type
      const connected = await context.db.Test_Connected.create({
        name: 'test',
      });

      // Add some data
      await context.db.Test_Test.create({
        string: 'Some string',
        description: 'Description yo',
        connected: connected.id,
      });

      // Cannot add another one bcs. of unique violation
      try {
        await context.db.Test_Test.create({
          string: 'Some string',
          description: 'Description yo',
          connected: connected.id,
        });
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('handler.postgres.errors.unique');
      }

      // Other unique combination is possible
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
      });

      // Now migrate (remove one index, change fields in other)
      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      // NULL values from previous inserts are considered not equal
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
        boolean: false,
      });
      try {
        await context.db.Test_Test.create({
          connected: connected.id,
          string: 'Some other string',
          description: 'Description yo',
          boolean: false,
        });
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('handler.postgres.errors.unique');
      }

      // Add same values, but add boolean (which was added to unique index)
      await context.db.Test_Test.create({
        connected: connected.id,
        string: 'Some other string',
        description: 'Description yo',
        boolean: true,
      });

      // Migration fails bcs. of unique values
      try {
        context = await migrateTestContext(
          context,
          await getModules('composite-unique-index-1')
        );
        throw new Error('Did not fail');
      } catch (e) {
        expect(e.message).to.include('could not create unique index');
      }

      // Delete all rows and succeed afterwards
      await context.db.Test_Test.delete(() => {});
      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-1')
      );

      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      await destroyTestContext(context);
    });

    it('removes composite unique indexes in project schema', async () => {
      let context = await createTestContext(
        await getModules('composite-unique-index-1'),
        { dbSchemaName: 'test' }
      );

      // Create connected type
      let node = await context.db.Test_CompositeUnique.create({
        name: 'test',
        key: '1',
      });

      // Make sure unique index was added
      try {
        node = await context.db.Test_CompositeUnique.create({
          name: 'test',
          key: '1',
        });
        throw new Error('Exception not thrown');
      } catch (e) {
        expect(e.message).to.include('Unique constraint');
      }

      context = await migrateTestContext(
        context,
        await getModules('composite-unique-index-2')
      );

      // Check if unique constraint was removed and we can now add things
      node = await context.db.Test_CompositeUnique.create({
        name: 'test',
        key: '1',
      });
      const nodes = await context.db.Test_CompositeUnique.fetchAll();
      expect(nodes.length).to.equal(2);

      await destroyTestContext(context);
    });
  });

  describe('Connection', () => {
    it('throws error if node field is changed to relation', async () => {
      let context = await createTestContext(
        await getModules('change-objectfield-to-relation-1')
      );

      const query = `{
        result: Test_listTest {
          edges {
            node {
              id
            }
          }
        }
      }`;

      // Can perform basic read operations
      const result = await executeQuery(query, context);
      expect(result).to.deep.equal({ result: { edges: [] } });

      // Change to relation
      context = await migrateTestContext(
        context,
        await getModules('change-objectfield-to-relation-2')
      );

      // Change back to regular field
      context = await migrateTestContext(
        context,
        await getModules('change-objectfield-to-relation-1')
      );

      await destroyTestContext(context);
    });
  });

  describe('Enum', () => {
    it('creates enum and changes types successfully ', async () => {
      const query = `{
        enums: Test_listEnumTest {
          edges {
            node {
              id
              enum
            }
          }
        }
      }`;
      const createMutation = `mutation M($input: Test_createEnumTestInput!) {
        create: Test_createEnumTest(input: $input) {
          node {
            enum
          }
        }
      }`;
      let context = await createTestContext(
        await getModules('enum-type-add-value-change-field-type-1')
      );

      // Can perform basic read operations
      const result = await executeQuery(query, context);
      expect(result).to.deep.equal({ enums: { edges: [] } });

      // Now add an enum value
      context = await migrateTestContext(
        context,
        await getModules('enum-type-add-value-change-field-type-2')
      );

      // Add node with enum value
      const createResult = await executeQuery(createMutation, context, {
        input: {
          enum: 'THIRD',
        },
      });
      await destroyTestContext(context);
      expect(createResult).to.deep.equal({
        create: { node: { enum: 'THIRD' } },
      });
    });

    it('adds value to enum type ', async () => {
      const query = `{
        enums: Test_listEnumTest {
          edges {
            node {
              id
              enum
            }
          }
        }
      }`;
      const createMutation = `mutation M($input: Test_createEnumTestInput!) {
        create: Test_createEnumTest(input: $input) {
          node {
            enum
          }
        }
      }`;
      let context = await createTestContext(
        await getModules('enum-type-add-value-1')
      );

      // Can perform basic read operations
      const result = await executeQuery(query, context);
      expect(result).to.deep.equal({ enums: { edges: [] } });

      // Now add an enum value
      context = await migrateTestContext(
        context,
        await getModules('enum-type-add-value-2')
      );

      // Add node with enum value
      const createResult = await executeQuery(createMutation, context, {
        input: {
          enum: 'THIRD',
        },
      });
      await destroyTestContext(context);
      expect(createResult).to.deep.equal({
        create: { node: { enum: 'THIRD' } },
      });
    });
  });
});

async function getContentBaseTypes(context: Context) {
  // Create locale
  const locale = await context.db.Locale.find({
    isDefault: true,
  });

  const status = await context.db.ContentStatus.find({
    name: 'PUBLISHED',
  });

  return {
    locale,
    status,
  };
}

async function getModules(name: string): Promise<Array<ModuleConfig>> {
  return await buildModules(path.join(__dirname, 'testprojects', name));
}
