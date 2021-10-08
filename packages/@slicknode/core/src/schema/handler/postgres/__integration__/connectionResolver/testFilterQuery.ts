/**
 * Created by Ivo Meißner on 16.04.17.
 *
 */

import { expect } from 'chai';
import { executeQuery } from '../../../../../test/utils';
import Context from '../../../../../context';
import _ from 'lodash';

export default async function testFilterQuery(
  filter: {
    [x: string]: any;
  },
  limit: number,
  expectedValues: Array<any>,
  expectedHasNextPage: boolean,
  expectedCount: number,
  context: Context,
  orderBy:
    | {
        [x: string]: any;
      }
    | undefined
    | null = null
) {
  if (Object.keys(filter).length < 1) {
    throw new Error('Please provide filter values');
  }
  // Test for n:m relationship
  const queryNM = `query ($filter: _UserFilter!, $limit: Int!, $orderBy: _UserConnection_withMembershipEdgeOrder){
    groups(first: 1) {
      edges {
        node {
          users(first: $limit, filter: {node: $filter}, orderBy: $orderBy) {
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
            edges {
              node {
                id
                userType
                intField
                intOrderField
                floatField
                floatOrderField
                even
                dateTimeField
                dateTimeOrderField
                name
                nameOrder
              }
            }
          }
        }
      }
    }
  }`;
  const resultNM = await executeQuery(queryNM, context, {
    filter,
    limit,
    orderBy,
  });
  expect(resultNM.groups.edges.length).to.equal(1);
  expect(resultNM.groups.edges[0].node.users.edges.length).to.equal(
    expectedCount
  );
  expect(resultNM.groups.edges[0].node.users.pageInfo.hasNextPage).to.equal(
    expectedHasNextPage
  );
  expect(resultNM.groups.edges[0].node.users.pageInfo.hasPreviousPage).to.equal(
    false
  );
  expectedValues.forEach((value, index) => {
    expect(
      _.pick(
        resultNM.groups.edges[0].node.users.edges[index].node,
        Object.keys(value)
      )
    ).to.deep.equal(value);
  });

  // Test 1:n with related node filtering
  if (orderBy === null) {
    const query1N = `query ($filter: _UserFilter!, $limit: Int!){
      groups(first: 1) {
        edges {
          node {
            memberships(first: $limit, filter: {node: {user: $filter}}) {
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
              edges {
                node {
                  user {
                    id
                    userType
                    intField
                    intOrderField
                    floatField
                    floatOrderField
                    even
                    dateTimeField
                    dateTimeOrderField
                    name
                    nameOrder
                  }
                }
              }
            }
          }
        }
      }
    }`;
    const result1N = await executeQuery(query1N, context, { filter, limit });
    expect(result1N.groups.edges[0].node.memberships.edges.length).to.equal(
      expectedCount
    );
    expect(
      result1N.groups.edges[0].node.memberships.pageInfo.hasNextPage
    ).to.equal(expectedHasNextPage);
    expect(
      result1N.groups.edges[0].node.memberships.pageInfo.hasPreviousPage
    ).to.equal(false);
    expectedValues.forEach((value, index) => {
      expect(
        _.pick(
          result1N.groups.edges[0].node.memberships.edges[index].node.user,
          Object.keys(value)
        )
      ).to.deep.equal(value);
    });
  }

  // Test 0:n
  const query0N = `query ($filter: _UserFilter!, $limit: Int!, $orderBy: _UserConnectionOrder){
    users(first: $limit, filter: {node: $filter}, orderBy: $orderBy) {
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      edges {
        node {
          id
          userType
          intField
          intOrderField
          floatField
          floatOrderField
          even
          dateTimeField
          dateTimeOrderField
          name
          nameOrder
        }
      }
    }
  }`;
  const result0N = await executeQuery(query0N, context, {
    filter,
    limit,
    orderBy,
  });
  expect(result0N.users.edges.length).to.equal(expectedCount);
  expect(result0N.users.pageInfo.hasNextPage).to.equal(expectedHasNextPage);
  expect(result0N.users.pageInfo.hasPreviousPage).to.equal(false);
  expectedValues.forEach((value, index) => {
    expect(
      _.pick(result0N.users.edges[index].node, Object.keys(value))
    ).to.deep.equal(value);
  });
}
