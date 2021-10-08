/**
 * Created by Ivo Meißner on 16.04.17.
 *
 */

import { expect } from 'chai';
import { executeQuery } from '../../../../../test/utils';
import Context from '../../../../../context';

/**
 * Tests the user connection ordering algorithms in combination with pagination
 *
 * @param orderFields
 * @param expectedIntValues
 * @param context
 */
export default async (
  orderFields: Array<string>,
  expectedIntValues: Array<number>,
  context: Context
) => {
  await testNMRelationship(orderFields, expectedIntValues, context);
  await test0NRelationship(orderFields, expectedIntValues, context);
  await test1NRelationship(orderFields, expectedIntValues, context);
};

/**
 * Tests the user connection ordering algorithms in n:m relationship
 *
 * @param orderFields
 * @param expectedIntValues
 * @param context
 */
async function testNMRelationship(
  orderFields: Array<string>,
  expectedIntValues: Array<number>,
  context: Context
) {
  let hasNextPage = true;
  let cursor = null;
  // n:m relationship
  const query = `query (
    $before: String, 
    $after: String, 
    $first: Int, 
    $last: Int, 
    $orderFields: [_UserSortableField!]!,
    $direction: OrderDirection
  ) {
    groups(first: 1) {
      edges {
        node {
          users(
            first: $first,
            last: $last,
            after: $after,
            before: $before,
            orderBy: {fields: $orderFields, direction: $direction}) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                intField
              }
            }
          }
        }
      }
    }
  }`;
  // n:m ordering ASC, forward pagination
  let intValues = [];
  let users;
  let result;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // n:m ordering DESC, forward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());

  // n:m ordering ASC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // n:m ordering DESC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());
}

/**
 * Tests the user connection ordering algorithms in 0:n relationship
 *
 * @param orderFields
 * @param expectedIntValues
 * @param context
 */
async function test0NRelationship(
  orderFields: Array<string>,
  expectedIntValues: Array<number>,
  context: Context
) {
  let hasNextPage = true;
  let cursor = null;
  // 0:n relationship
  const query = `query (
    $before: String, 
    $after: String, 
    $first: Int, 
    $last: Int, 
    $orderFields: [_UserSortableField!]!,
    $direction: OrderDirection
  ) {
    users(
      first: $first,
      last: $last,
      after: $after,
      before: $before,
      orderBy: {fields: $orderFields, direction: $direction}) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          intField
        }
      }
    }
  }`;
  // 0:n ordering ASC, forward pagination
  let intValues = [];
  let users;
  let result;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // 0:n ordering DESC, forward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());

  // 0:n ordering ASC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // 0:n ordering DESC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());
}
/**
 * Tests the user connection ordering algorithms in 1:n relationship
 *
 * @param orderFields
 * @param expectedIntValues
 * @param context
 */
async function test1NRelationship(
  orderFields: Array<string>,
  expectedIntValues: Array<number>,
  context: Context
) {
  let hasNextPage = true;
  let cursor = null;
  // 1:n relationship
  const query = `query (
    $before: String, 
    $after: String, 
    $first: Int, 
    $last: Int, 
    $orderFields: [_UserSortableField!]!,
    $direction: OrderDirection
  ) {
    groups(first: 1) {
      edges {
        node {
          users(
            first: $first,
            last: $last,
            after: $after,
            before: $before,
            orderBy: {fields: $orderFields, direction: $direction}) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                intField
              }
            }
          }
        }
      }
    }
  }`;
  // 1:n ordering ASC, forward pagination
  let intValues = [];
  let users;
  let result;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // 1:n ordering DESC, forward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      first: 5,
      after: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.endCursor;
    hasNextPage = users.pageInfo.hasNextPage;
    intValues.push(...users.edges.map((edge) => edge.node.intField));
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());

  // 1:n ordering ASC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'ASC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues);

  // 1:n ordering DESC, backward pagination
  intValues = [];
  hasNextPage = true;
  cursor = null;
  while (hasNextPage) {
    result = await executeQuery(query, context, {
      last: 5,
      before: cursor,
      orderFields,
      direction: 'DESC',
    });
    users = result.groups.edges[0].node.users;
    cursor = users.pageInfo.startCursor;
    hasNextPage = users.pageInfo.hasPreviousPage;
    intValues = users.edges.map((edge) => edge.node.intField).concat(intValues);
  }
  expect(intValues).to.deep.equal(expectedIntValues.concat().reverse());
}
