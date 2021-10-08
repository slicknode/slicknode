import { describe, it } from 'mocha';
import schema from './applyPermissionQueryFilterSchema';
import { createContextMock } from '../../../../test/utils';
import toTableName from '../toTableName';
import applyQueryFilter from '../applyQueryFilter';
import { expect } from 'chai';
import { QueryBuilder } from 'knex';
import { ObjectTypeConfig } from '../../../../definition';
import Context from '../../../../context';

describe('applyQueryFilter', () => {
  testApplyQueryFilter(
    'Adds AND filter to query',
    'User',
    {
      AND: [
        { name: { eq: 'e1@example.com' } },
        { name: { eq: 'e2@example.com' } },
      ],
    },
    `select * from "n_user" where ("n_user"."name" = 'e1@example.com'::text) and ("n_user"."name" = 'e2@example.com'::text)`
  );
  testApplyQueryFilter(
    'Adds AND filter to query with relationship',
    'User',
    {
      AND: [
        { name: { eq: 'e1@example.com' } },
        { groups: { node: { name: { eq: '234' } } } },
      ],
    },
    `select * from "n_user" where ("n_user"."name" = 'e1@example.com'::text) and (exists (select "_f2"."id" from "n_membership" as "_f2" inner join "n_group" as "_f1" on "_f2"."group" = "_f1"."id" where "_f2"."user" = "n_user"."id" and "_f1"."name" = '234'::text))`
  );
  testApplyQueryFilter(
    'Adds simple OR filter to query',
    'User',
    {
      OR: [
        { name: { eq: 'e1@example.com' } },
        { name: { eq: 'e2@example.com' } },
      ],
    },
    `select * from "n_user" where (("n_user"."name" = 'e1@example.com'::text) or ("n_user"."name" = 'e2@example.com'::text))`
  );
  testApplyQueryFilter(
    'Adds multiple OR filters to query',
    'User',
    {
      OR: [
        { name: { eq: 'e1@example.com' } },
        { name: { eq: 'e2@example.com' } },
        { name: { eq: 'e3@example.com' } },
      ],
    },
    `select * from "n_user" where (("n_user"."name" = 'e1@example.com'::text) or ("n_user"."name" = 'e2@example.com'::text) or ("n_user"."name" = 'e3@example.com'::text))`
  );
  testApplyQueryFilter(
    'Adds OR filter to query with relationship',
    'User',
    {
      OR: [
        { name: { eq: 'e1@example.com' } },
        { groups: { node: { name: { eq: '234' } } } },
      ],
    },
    `select * from "n_user" where (("n_user"."name" = 'e1@example.com'::text) or (exists (select "_f2"."id" from "n_membership" as "_f2" inner join "n_group" as "_f1" on "_f2"."group" = "_f1"."id" where "_f2"."user" = "n_user"."id" and "_f1"."name" = '234'::text)))`
  );
  testApplyQueryFilter(
    'Ignores NULL values for OR filter',
    'User',
    {
      OR: null,
    },
    `select * from "n_user"`
  );
  testApplyQueryFilter(
    'Ignores NULL values for AND filter',
    'User',
    {
      AND: null,
    },
    `select * from "n_user"`
  );

  testApplyQueryFilter(
    'Ignores empty array values for AND filter',
    'User',
    {
      AND: [{}],
    },
    `select * from "n_user"`
  );

  testApplyQueryFilter(
    'Ignores empty array values for AND filter',
    'User',
    {
      OR: [{}],
    },
    `select * from "n_user"`
  );

  testApplyQueryFilter(
    'Throws error if AND is combined with other fields',
    'User',
    {
      AND: [],
      name: { eq: 'test' },
    },
    'The filter "AND" cannot be used together with other filters: "name"',
    true
  );

  testApplyQueryFilter(
    'Throws error if OR is combined with other fields',
    'User',
    {
      OR: [],
      name: { eq: 'test' },
    },
    'The filter "OR" cannot be used together with other filters: "name"',
    true
  );
});

export function testApplyQueryFilter(
  description: string,
  typeName: string,
  filter: {
    [x: string]: any;
  },
  expectedQuery: string,
  throws: boolean = false
): void {
  it(description, () => {
    const context = createContextMock(schema);

    const tableName = toTableName(
      context.schemaBuilder.getObjectTypeConfig(typeName),
      context.getDBSchemaName()
    );
    const queryBuilder = context.getDBWrite()(tableName);
    let aliasCount = 0;
    const getTableAlias = () => {
      aliasCount++;
      return '_f' + aliasCount;
    };

    if (throws) {
      expect(() => {
        applyQueryFilter({
          query: queryBuilder,
          filter,
          typeConfig: context.schemaBuilder.getObjectTypeConfig(typeName),
          tableName,
          getTableAlias,
          context,
          noPermissionFilters: true,
          preview: false,
        });
      }).to.throw(expectedQuery);
      return;
    }

    const result = applyQueryFilter({
      query: queryBuilder,
      filter,
      typeConfig: context.schemaBuilder.getObjectTypeConfig(typeName),
      tableName,
      getTableAlias,
      context,
      noPermissionFilters: true,
      preview: false,
    });
    expect(result.toString()).to.equal(expectedQuery);
  });
}
