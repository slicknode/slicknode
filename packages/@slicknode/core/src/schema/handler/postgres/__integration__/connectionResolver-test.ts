/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import chai, { expect } from 'chai';
import { it, describe, before, after, afterEach } from 'mocha';
import {
  executeWithTestContext,
  destroyTestContext,
  executeQuery,
} from '../../../../test/utils';
import { testFilterQuery, testOrderedPagination } from './connectionResolver';
import schemaConfig from './connectionTestSchemaConfig';
import handler from '../index';
import chaiAsPromised from 'chai-as-promised';
import _ from 'lodash';
import {
  CONNECTION_NODES_MAX,
  CONNECTION_NODES_DEFAULT,
} from '../../../../config';
import { toGlobalId, fromGlobalId } from '../../../../utils/id';

chai.use(chaiAsPromised);
/* eslint-disable no-unused-expressions */

describe('Postgres connectionResolver', () => {
  let context = null;
  const userIds = [];
  before(function (done) {
    this.timeout(20000);
    executeWithTestContext(schemaConfig, (c) => {
      async function populateTestData() {
        // Create groups
        const groupPromises = _.range(101).map((index) => {
          return handler.create(
            c.schemaBuilder.getObjectTypeConfig('Group'),
            {
              id: index + 1,
              name: `name${index}`,
            },
            c
          );
        });
        const groups = [];
        for (let j = 0; j < groupPromises.length; j++) {
          const tmpGroup = await groupPromises[j];
          groups.push(tmpGroup);
        }

        // Create users
        const userPromises = _.range(10).map((index) => {
          const values: {
            [x: string]: any;
          } = {
            id: index + 1,
            name: `name${index}`,
            nameOrder: `nameOrder${index % 3}`,
            intField: index,
            intOrderField: index % 3,
            floatField: 1000 + index,
            floatOrderField: (index % 3) / 10,
            even: index === 0 ? null : index % 2 === 0,
            dateTimeField: String(2000 + index) + '-01-01T00:00:00Z',
            dateTimeOrderField: String(2000 + (index % 3)) + '-01-01T00:00:00Z',
            group: groups[0].id,
            userType: null,
          };
          switch (index % 4) {
            case 0:
              values.userType = 'ADMIN';
              break;
            case 1:
              values.userType = 'STAFF';
              break;
            case 2:
              values.userType = 'USER';
              break;
          }
          return handler.create(
            c.schemaBuilder.getObjectTypeConfig('User'),
            values,
            c
          );
        });
        const users = [];
        for (let i = 0; i < userPromises.length; i++) {
          const tmpUser = await userPromises[i];
          users.push(tmpUser);
        }

        const results = [...users, ...groups];

        // Add memberships
        const memberships = [];
        _.range(0, 10).forEach((userIndex) => {
          userIds.push(_.trim(toGlobalId('User', results[userIndex].id), '='));
          _.range(10, 101).forEach((groupIndex, memberId) => {
            memberships.push(
              handler.create(
                c.schemaBuilder.getObjectTypeConfig('Membership'),
                {
                  id: userIndex * 1000 + groupIndex,
                  user: results[userIndex].id,
                  group: results[groupIndex].id,
                  memberId: 'member' + memberId,
                },
                c
              )
            );
          });
        });
        // Execute mutations sequentially
        for (let k = 0; k < memberships.length; k++) {
          await memberships[k];
        }

        // Add user profiles
        const profilePromises = userIds
          .map((id) => fromGlobalId(id).id)
          .map((id) =>
            context.db.UserProfile.create({
              user: id,
              profileText: `profile${id}`,
            })
          );
        await Promise.all(profilePromises);

        // Create foreign user accounts
        const foreignAccountsPromises = _.range(5).map((index) => {
          return context.db.ForeignUser.create({
            userName: `username${index}`,
          });
        });
        const foreignAccounts = await Promise.all(foreignAccountsPromises);

        // Create connections to foreign user accounts
        const foreignUserConncetionPromises = foreignAccounts.map(
          ({ id }, index) => {
            return context.db.ForeignUserConnection.create({
              user: fromGlobalId(userIds[index]).id,
              foreignUser: id,
            });
          }
        );
        await Promise.all(foreignUserConncetionPromises);
      }
      context = c;
      populateTestData().then(done).catch(done);
    });
  });

  after((done) => {
    destroyTestContext(context).then(() => done());
  });

  afterEach(() => {
    context.clearCache();
  });

  describe('0:n Connection', () => {
    it('returns total count', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          totalCount
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.totalCount).to.equal('10');
          done();
        })
        .catch((error) => done(error));
    });

    it('handles question marks in input arguments', async () => {
      const result = await executeQuery(
        `{
        users(filter: {node: {name: {in: ["?"]}}}) {
          totalCount
        }
      }`,
        context
      );
      expect(result.users.totalCount).to.equal('0');
    });

    it('returns first nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
              intField
              even
              floatField
              userType
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(5);
          expect(result.users.pageInfo.hasNextPage).to.be.true;
          expect(result.users.pageInfo.hasPreviousPage).to.be.false;
          expect(result.users.edges[0].node.name).to.equal('name0');
          expect(result.users.edges[0].node.intField).to.equal(0);
          expect(result.users.edges[0].node.floatField).to.equal(1000);
          expect(result.users.edges[0].node.even).to.equal(null);
          expect(result.users.edges[0].node.userType).to.equal('ADMIN');
          expect(result.users.edges[1].node.name).to.equal('name1');
          expect(result.users.edges[1].node.even).to.equal(false);
          expect(result.users.edges[2].node.name).to.equal('name2');
          expect(result.users.edges[3].node.name).to.equal('name3');
          expect(result.users.edges[4].node.name).to.equal('name4');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns batches for first nodes with unfiltered query + one filtered', async () => {
      const result = await executeQuery(
        `
        fragment F on _UserConnection {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
          edges {
            cursor
            node {
              id
              name
              intField
              even
              floatField
              userType
            }
          }
        }
      query {
        users(first: 5) {
          ...F
        }
        users2: users(first: 10) {
          ...F
        }
      }`,
        context
      );
      expect(result.users.edges.length).to.equal(5);
      expect(result.users.pageInfo.hasNextPage).to.be.true;
      expect(result.users.pageInfo.hasPreviousPage).to.be.false;
      expect(result.users.edges[0].node.name).to.equal('name0');
      expect(result.users.edges[0].node.intField).to.equal(0);
      expect(result.users.edges[0].node.floatField).to.equal(1000);
      expect(result.users.edges[0].node.even).to.equal(null);
      expect(result.users.edges[0].node.userType).to.equal('ADMIN');
      expect(result.users.edges[1].node.name).to.equal('name1');
      expect(result.users.edges[1].node.even).to.equal(false);
      expect(result.users.edges[2].node.name).to.equal('name2');
      expect(result.users.edges[3].node.name).to.equal('name3');
      expect(result.users.edges[4].node.name).to.equal('name4');

      expect(result.users2.edges.length).to.equal(10);
      expect(result.users2.edges[0].node.name).to.equal('name0');
      expect(result.users2.edges[0].node.intField).to.equal(0);
      expect(result.users2.edges[0].node.floatField).to.equal(1000);
      expect(result.users2.edges[0].node.even).to.equal(null);
      expect(result.users2.edges[0].node.userType).to.equal('ADMIN');
      expect(result.users2.edges[1].node.name).to.equal('name1');
      expect(result.users2.edges[1].node.even).to.equal(false);
      expect(result.users2.edges[2].node.name).to.equal('name2');
      expect(result.users2.edges[3].node.name).to.equal('name3');
      expect(result.users2.edges[4].node.name).to.equal('name4');
    });

    it('returns last nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(last: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(5);
          expect(result.users.pageInfo.hasNextPage).to.be.false;
          expect(result.users.pageInfo.hasPreviousPage).to.be.true;
          expect(result.users.edges[0].node.name).to.equal('name5');
          expect(result.users.edges[1].node.name).to.equal('name6');
          expect(result.users.edges[2].node.name).to.equal('name7');
          expect(result.users.edges[3].node.name).to.equal('name8');
          expect(result.users.edges[4].node.name).to.equal('name9');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when first exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(first: 50) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(10);
          expect(result.users.pageInfo.hasNextPage).to.be.false;
          expect(result.users.pageInfo.hasPreviousPage).to.be.false;
          expect(result.users.edges[0].node.name).to.equal('name0');
          expect(result.users.edges[9].node.name).to.equal('name9');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when last exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(last: 50) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(10);
          expect(result.users.pageInfo.hasNextPage).to.be.false;
          expect(result.users.pageInfo.hasPreviousPage).to.be.false;
          expect(result.users.edges[0].node.name).to.equal('name0');
          expect(result.users.edges[9].node.name).to.equal('name9');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns first nodes when no pagination information provided', (done) => {
      executeQuery(
        `
      query {
        users {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).not.to.equal(0);
          expect(result.users.edges[0].node.name).to.equal('name0');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns only max amount of nodes', (done) => {
      executeQuery(
        `
      query {
        groups(first: 10000) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.groups.edges.length).to.equal(CONNECTION_NODES_MAX);
          expect(result.groups.edges[0].node.name).to.equal('name0');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns default number of nodes for no pagination info provided', (done) => {
      executeQuery(
        `
      query {
        groups {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.groups.edges.length).to.equal(CONNECTION_NODES_DEFAULT);
          expect(result.groups.edges[0].node.name).to.equal('name0');
          done();
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        groups(first: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.groups.edges.length).to.equal(5);
          expect(result.groups.pageInfo.endCursor).to.not.be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          groups(first: 3, after: $cursor) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
            context,
            { cursor: result.groups.pageInfo.endCursor }
          )
            .then((result2) => {
              expect(result2.groups.edges.length).to.equal(3);
              expect(result2.groups.edges[0].node.name).to.equal('name5');
              expect(result2.groups.edges[1].node.name).to.equal('name6');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles backward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        groups(last: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.groups.edges.length).to.equal(5);
          expect(result.groups.pageInfo.startCursor).to.not.be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          groups(last: 3, before: $cursor) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
            context,
            { cursor: result.groups.pageInfo.startCursor }
          )
            .then((result2) => {
              expect(result2.groups.edges.length).to.equal(3);
              expect(result2.groups.edges[0].node.name).to.equal('name93');
              expect(result2.groups.edges[1].node.name).to.equal('name94');
              expect(result2.groups.edges[2].node.name).to.equal('name95');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles backward pagination with cursor without result size', (done) => {
      executeQuery(
        `
      query {
        groups(last: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.groups.edges.length).to.equal(5);
          expect(result.groups.pageInfo.startCursor).to.not.be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          groups(before: $cursor) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
            context,
            { cursor: result.groups.pageInfo.startCursor }
          )
            .then((result2) => {
              expect(result2.groups.edges.length).to.equal(
                CONNECTION_NODES_DEFAULT
              );
              expect(result2.groups.edges[0].node.name).to.equal('name86');
              expect(result2.groups.edges[1].node.name).to.equal('name87');
              expect(result2.groups.edges[2].node.name).to.equal('name88');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with skip', async () => {
      const result = await executeQuery(
        `
      query {
        groups(skip: 5, first: 5) {
          totalCount
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      );

      expect(result.groups.edges.length).to.equal(5);
      expect(result.groups.pageInfo.endCursor).to.not.be.null;
      expect(result.groups.edges[0].node.name).to.equal('name5');
      expect(result.groups.edges[1].node.name).to.equal('name6');
      expect(result.groups.totalCount).to.equal('101');
    });

    it('handles forward pagination with skip 0', async () => {
      const result = await executeQuery(
        `
      query {
        groups(skip: 0, first: 5) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          edges {
            cursor
            node {
              id
              name
            }
          }
        }
      }`,
        context
      );

      expect(result.groups.edges.length).to.equal(5);
      expect(result.groups.pageInfo.endCursor).to.not.be.null;
      expect(result.groups.edges[0].node.name).to.equal('name0');
      expect(result.groups.edges[1].node.name).to.equal('name1');
    });

    it('throws error for negative skip value', async () => {
      try {
        await executeQuery(
          `
        query {
          groups(skip: -10, first: 5) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input argument: Skip has to be a positive number'
        );
      }
    });

    it('throws error for skip and before cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          groups(skip: 10, before: "5") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });

    it('throws error for skip and after cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          groups(skip: 10, after: "5") {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });

    it('throws error for skip and last', async () => {
      try {
        await executeQuery(
          `
        query {
          groups(skip: 10, last: 20) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            edges {
              cursor
              node {
                id
                name
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });
  });

  describe('n:m Connection via edge', () => {
    it('returns first nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              groups {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(
            result.users.edges[0].node.groups.pageInfo.hasNextPage
          ).to.equal(true);
          expect(
            result.users.edges[0].node.groups.pageInfo.hasPreviousPage
          ).to.equal(false);
          expect(result.users.edges[0].node.groups.edges.length).to.equal(
            CONNECTION_NODES_DEFAULT
          );
          expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
            'name0'
          );
          expect(result.users.edges[0].node.groups.edges[1].node.name).to.equal(
            'name1'
          );
          done();
        })
        .catch((error) => done(error));
    });

    it('returns first nodes for unfiltered query in batches', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 5) {
          edges {
            node {
              id
              name
              groups {
                totalCount
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );

      expect(result.users.edges.length).to.equal(5);
      for (let i = 0; i < result.users.edges.length; i++) {
        expect(result.users.edges[i].node.groups.totalCount).to.equal('91');
        expect(result.users.edges[i].node.groups.pageInfo.hasNextPage).to.equal(
          true
        );
        expect(
          result.users.edges[i].node.groups.pageInfo.hasPreviousPage
        ).to.equal(false);
        expect(result.users.edges[i].node.groups.edges.length).to.equal(
          CONNECTION_NODES_DEFAULT
        );
        expect(result.users.edges[i].node.groups.edges[0].node.name).to.equal(
          'name0'
        );
        expect(result.users.edges[i].node.groups.edges[1].node.name).to.equal(
          'name1'
        );
      }
    });

    it('returns totalCount for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              groups {
                totalCount
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(result.users.edges[0].node.groups.totalCount).to.equal('91');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns last nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              groups(last: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(result.users.edges[0].node.groups.pageInfo.hasNextPage).to.be
            .false;
          expect(result.users.edges[0].node.groups.pageInfo.hasPreviousPage).to
            .be.true;
          expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
            'name86'
          );
          expect(result.users.edges[0].node.groups.edges[1].node.name).to.equal(
            'name87'
          );
          expect(result.users.edges[0].node.groups.edges[2].node.name).to.equal(
            'name88'
          );
          expect(result.users.edges[0].node.groups.edges[3].node.name).to.equal(
            'name89'
          );
          expect(result.users.edges[0].node.groups.edges[4].node.name).to.equal(
            'name90'
          );
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when first exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            cursor
            node {
              groups(first: 500) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(91);
          expect(result.users.edges[0].node.groups.pageInfo.hasNextPage).to.be
            .false;
          expect(result.users.edges[0].node.groups.pageInfo.hasPreviousPage).to
            .be.false;
          expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
            'name0'
          );
          expect(
            result.users.edges[0].node.groups.edges[90].node.name
          ).to.equal('name90');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when last exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            cursor
            node {
              groups(last: 500) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(91);
          expect(result.users.edges[0].node.groups.pageInfo.hasNextPage).to.be
            .false;
          expect(result.users.edges[0].node.groups.pageInfo.hasPreviousPage).to
            .be.false;
          expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
            'name0'
          );
          expect(
            result.users.edges[0].node.groups.edges[90].node.name
          ).to.equal('name90');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns max amount of nodes', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            cursor
            node {
              groups(last: 500000) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(91);
          expect(result.users.edges[0].node.groups.pageInfo.hasNextPage).to.be
            .false;
          expect(result.users.edges[0].node.groups.pageInfo.hasPreviousPage).to
            .be.false;
          expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
            'name0'
          );
          expect(
            result.users.edges[0].node.groups.edges[90].node.name
          ).to.equal('name90');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns additional edge fields', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              groups(first: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  memberId
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(5);
          expect(result.users.edges[0].node.groups.pageInfo.hasNextPage).to.be
            .true;
          expect(result.users.edges[0].node.groups.pageInfo.hasPreviousPage).to
            .be.false;
          expect(result.users.edges[0].node.groups.edges[0].memberId).to.equal(
            'member0'
          );
          expect(result.users.edges[0].node.groups.edges[4].memberId).to.equal(
            'member4'
          );
          done();
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              groups(first: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(5);
          expect(result.users.edges[0].node.groups.pageInfo.endCursor).to.not.be
            .null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          users(first: 1) {
            edges {
              node {
                groups(first: 3, after: $cursor) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
            context,
            { cursor: result.users.edges[0].node.groups.pageInfo.endCursor }
          )
            .then((result2) => {
              expect(result2.users.edges[0].node.groups.edges.length).to.equal(
                3
              );
              expect(
                result2.users.edges[0].node.groups.edges[0].node.name
              ).to.equal('name5');
              expect(
                result2.users.edges[0].node.groups.edges[1].node.name
              ).to.equal('name6');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles backward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              groups(last: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.groups.edges.length).to.equal(5);
          expect(result.users.edges[0].node.groups.pageInfo.startCursor).to.not
            .be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          users(first: 1) {
            edges {
              node {
                groups(last: 3, before: $cursor) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
            context,
            { cursor: result.users.edges[0].node.groups.pageInfo.startCursor }
          )
            .then((result2) => {
              expect(result2.users.edges[0].node.groups.edges.length).to.equal(
                3
              );
              expect(
                result2.users.edges[0].node.groups.edges[0].node.name
              ).to.equal('name83');
              expect(
                result2.users.edges[0].node.groups.edges[1].node.name
              ).to.equal('name84');
              expect(
                result2.users.edges[0].node.groups.edges[2].node.name
              ).to.equal('name85');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with skip', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              groups(first: 5, skip: 10) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );
      expect(result.users.edges[0].node.groups.edges.length).to.equal(5);
      expect(result.users.edges[0].node.groups.pageInfo.startCursor).to.not.be
        .null;
      expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
        'name10'
      );
      expect(result.users.edges[0].node.groups.edges[1].node.name).to.equal(
        'name11'
      );
      expect(result.users.edges[0].node.groups.edges[2].node.name).to.equal(
        'name12'
      );
    });

    it('handles forward pagination with skip 0', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              groups(first: 5, skip: 0) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );
      expect(result.users.edges[0].node.groups.edges.length).to.equal(5);
      expect(result.users.edges[0].node.groups.pageInfo.startCursor).to.not.be
        .null;
      expect(result.users.edges[0].node.groups.edges[0].node.name).to.equal(
        'name0'
      );
      expect(result.users.edges[0].node.groups.edges[1].node.name).to.equal(
        'name1'
      );
      expect(result.users.edges[0].node.groups.edges[2].node.name).to.equal(
        'name2'
      );
    });

    it('throws error with negative skip value', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                groups(first: 5, skip: -100) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input argument: Skip has to be a positive number'
        );
      }
    });

    it('throws error with skip and before cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                groups(first: 5, skip: 10, before: "34") {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });

    it('throws error with skip and after cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                groups(first: 5, skip: 10, after: "34") {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });
  });

  describe('1:n Connection', () => {
    it('returns first nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              memberships {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    id
                    memberId
                    user {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(
            result.users.edges[0].node.memberships.pageInfo.hasNextPage
          ).to.equal(true);
          expect(
            result.users.edges[0].node.memberships.pageInfo.hasPreviousPage
          ).to.equal(false);
          expect(result.users.edges[0].node.memberships.edges.length).to.equal(
            CONNECTION_NODES_DEFAULT
          );
          expect(
            result.users.edges[0].node.memberships.edges[0].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[1].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[2].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[0].node.memberId
          ).to.equal('member0');
          expect(
            result.users.edges[0].node.memberships.edges[1].node.memberId
          ).to.equal('member1');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns first nodes for unfiltered query via joined string field', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              sameNameOrderUsers {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    name
                    nameOrder
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );
      expect(result.users.edges.length).to.equal(1);
      expect(result.users.edges[0].node.sameNameOrderUsers.pageInfo.hasNextPage)
        .to.be.false;
      expect(
        result.users.edges[0].node.sameNameOrderUsers.pageInfo.hasPreviousPage
      ).to.be.false;
      expect(
        result.users.edges[0].node.sameNameOrderUsers.edges[0].node.name
      ).to.equal('name0');
      expect(
        result.users.edges[0].node.sameNameOrderUsers.edges[1].node.name
      ).to.equal('name3');
      expect(
        result.users.edges[0].node.sameNameOrderUsers.edges[2].node.name
      ).to.equal('name6');
    });

    it('returns last nodes for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              id
              name
              memberships(last: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                }
                edges {
                  node {
                    id
                    memberId
                    user {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(result.users.edges[0].node.memberships.pageInfo.hasNextPage).to
            .be.false;
          expect(
            result.users.edges[0].node.memberships.pageInfo.hasPreviousPage
          ).to.be.true;
          expect(
            result.users.edges[0].node.memberships.edges[0].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[1].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[2].node.user.name
          ).to.equal('name0');
          expect(
            result.users.edges[0].node.memberships.edges[0].node.memberId
          ).to.equal('member86');
          expect(
            result.users.edges[0].node.memberships.edges[1].node.memberId
          ).to.equal('member87');
          expect(
            result.users.edges[0].node.memberships.edges[2].node.memberId
          ).to.equal('member88');
          expect(
            result.users.edges[0].node.memberships.edges[3].node.memberId
          ).to.equal('member89');
          expect(
            result.users.edges[0].node.memberships.edges[4].node.memberId
          ).to.equal('member90');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns totalCount for unfiltered query', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              memberships(last: 5) {
                totalCount
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges.length).to.equal(1);
          expect(result.users.edges[0].node.memberships.totalCount).to.equal(
            '91'
          );
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when first exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            cursor
            node {
              memberships(first: 500) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    memberId
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.memberships.edges.length).to.equal(
            91
          );
          expect(result.users.edges[0].node.memberships.pageInfo.hasNextPage).to
            .be.false;
          expect(
            result.users.edges[0].node.memberships.pageInfo.hasPreviousPage
          ).to.be.false;
          expect(
            result.users.edges[0].node.memberships.edges[0].node.memberId
          ).to.equal('member0');
          expect(
            result.users.edges[0].node.memberships.edges[90].node.memberId
          ).to.equal('member90');
          done();
        })
        .catch((error) => done(error));
    });

    it('returns all nodes when last exceeds existing records', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            cursor
            node {
              memberships(last: 500) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  node {
                    memberId
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.memberships.edges.length).to.equal(
            91
          );
          expect(result.users.edges[0].node.memberships.pageInfo.hasNextPage).to
            .be.false;
          expect(
            result.users.edges[0].node.memberships.pageInfo.hasPreviousPage
          ).to.be.false;
          expect(
            result.users.edges[0].node.memberships.edges[0].node.memberId
          ).to.equal('member0');
          expect(
            result.users.edges[0].node.memberships.edges[90].node.memberId
          ).to.equal('member90');
          done();
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              memberships(first: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    memberId
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.memberships.edges.length).to.equal(
            5
          );
          expect(result.users.edges[0].node.memberships.pageInfo.endCursor).to
            .not.be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          users(first: 1) {
            edges {
              node {
                memberships(first: 3, after: $cursor) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      memberId
                      user {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
            context,
            {
              cursor: result.users.edges[0].node.memberships.pageInfo.endCursor,
            }
          )
            .then((result2) => {
              expect(
                result2.users.edges[0].node.memberships.edges.length
              ).to.equal(3);
              expect(
                result2.users.edges[0].node.memberships.edges[0].node.user.name
              ).to.equal('name0');
              expect(
                result2.users.edges[0].node.memberships.edges[1].node.user.name
              ).to.equal('name0');

              expect(
                result2.users.edges[0].node.memberships.edges[0].node.memberId
              ).to.equal('member5');
              expect(
                result2.users.edges[0].node.memberships.edges[1].node.memberId
              ).to.equal('member6');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles backward pagination with cursor', (done) => {
      executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              memberships(last: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    user {
                      name
                    }
                    id
                    memberId
                  }
                }
              }
            }
          }
        }
      }`,
        context
      )
        .then((result) => {
          expect(result.users.edges[0].node.memberships.edges.length).to.equal(
            5
          );
          expect(result.users.edges[0].node.memberships.pageInfo.startCursor).to
            .not.be.null;

          // Get next page
          executeQuery(
            `query PaginateGroups($cursor: String) {
          users(first: 1) {
            edges {
              node {
                memberships(last: 3, before: $cursor) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      user {
                        name
                      }
                      id
                      memberId
                    }
                  }
                }
              }
            }
          }
        }`,
            context,
            {
              cursor:
                result.users.edges[0].node.memberships.pageInfo.startCursor,
            }
          )
            .then((result2) => {
              expect(
                result2.users.edges[0].node.memberships.edges.length
              ).to.equal(3);
              expect(
                result2.users.edges[0].node.memberships.edges[0].node.user.name
              ).to.equal('name0');
              expect(
                result2.users.edges[0].node.memberships.edges[1].node.user.name
              ).to.equal('name0');
              expect(
                result2.users.edges[0].node.memberships.edges[0].node.memberId
              ).to.equal('member83');
              expect(
                result2.users.edges[0].node.memberships.edges[1].node.memberId
              ).to.equal('member84');
              expect(
                result2.users.edges[0].node.memberships.edges[2].node.memberId
              ).to.equal('member85');
              done();
            })
            .catch((error) => done(error));
        })
        .catch((error) => done(error));
    });

    it('handles forward pagination with skip', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              memberships(first: 5, skip: 5) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    memberId
                    user {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );
      expect(result.users.edges[0].node.memberships.edges.length).to.equal(5);
      expect(result.users.edges[0].node.memberships.pageInfo.endCursor).to.not
        .be.null;

      expect(
        result.users.edges[0].node.memberships.edges[0].node.user.name
      ).to.equal('name0');
      expect(
        result.users.edges[0].node.memberships.edges[1].node.user.name
      ).to.equal('name0');

      expect(
        result.users.edges[0].node.memberships.edges[0].node.memberId
      ).to.equal('member5');
      expect(
        result.users.edges[0].node.memberships.edges[1].node.memberId
      ).to.equal('member6');
    });

    it('handles forward pagination with skip 0', async () => {
      const result = await executeQuery(
        `
      query {
        users(first: 1) {
          edges {
            node {
              memberships(first: 5, skip: 0) {
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                edges {
                  cursor
                  node {
                    memberId
                    user {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }`,
        context
      );
      expect(result.users.edges[0].node.memberships.edges.length).to.equal(5);
      expect(result.users.edges[0].node.memberships.pageInfo.endCursor).to.not
        .be.null;

      expect(
        result.users.edges[0].node.memberships.edges[0].node.user.name
      ).to.equal('name0');
      expect(
        result.users.edges[0].node.memberships.edges[1].node.user.name
      ).to.equal('name0');

      expect(
        result.users.edges[0].node.memberships.edges[0].node.memberId
      ).to.equal('member0');
      expect(
        result.users.edges[0].node.memberships.edges[1].node.memberId
      ).to.equal('member1');
    });

    it('throws error for negative skip value', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                memberships(first: 5, skip: -10) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      memberId
                      user {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input argument: Skip has to be a positive number'
        );
      }
    });

    it('throws error for skip value with before cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                memberships(first: 5, skip: 1, before: "12") {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      memberId
                      user {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });

    it('throws error for skip value with after cursor', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                memberships(first: 5, skip: 1, after: "12") {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      memberId
                      user {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });

    it('throws error for skip value with last', async () => {
      try {
        await executeQuery(
          `
        query {
          users(first: 1) {
            edges {
              node {
                memberships(last: 5, skip: 1) {
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                  edges {
                    cursor
                    node {
                      memberId
                      user {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
          context
        );
        throw new Error('Does not throw error');
      } catch (e) {
        expect(e.message).to.include(
          'Invalid input arguments: Offset based pagination cannot be combined with cursor pagination'
        );
      }
    });
  });

  describe('Connection filter', () => {
    describe('ID filter', () => {
      it('returns nodes with ID eq filter', (done) => {
        testFilterQuery(
          { id: { eq: userIds[5] } }, // Filter values
          20, // Requested limit
          [{ id: userIds[5] }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID notEq filter', (done) => {
        testFilterQuery(
          { id: { notEq: userIds[0] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[1] }, { id: userIds[2] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID in filter', (done) => {
        testFilterQuery(
          {
            id: {
              in: [userIds[3], userIds[5], userIds[9], 'invalid', 'invalid?'],
            },
          }, // Filter values
          5, // Requested limit
          [{ id: userIds[3] }, { id: userIds[5] }, { id: userIds[9] }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID notIn filter', (done) => {
        testFilterQuery(
          { id: { notIn: [userIds[1], userIds[2], userIds[4], 'invalid'] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[0] }, { id: userIds[3] }, { id: userIds[5] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID gt filter', (done) => {
        testFilterQuery(
          { id: { gt: userIds[5] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[6] }, { id: userIds[7] }, { id: userIds[8] }], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID gte filter', (done) => {
        testFilterQuery(
          { id: { gte: userIds[5] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[5] }, { id: userIds[6] }, { id: userIds[7] }], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID lt filter', (done) => {
        testFilterQuery(
          { id: { lt: userIds[3] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[0] }, { id: userIds[1] }, { id: userIds[2] }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID lte filter', (done) => {
        testFilterQuery(
          { id: { lte: userIds[3] } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[2] },
            { id: userIds[3] },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID isNull false filter', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[2] },
            { id: userIds[3] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID isNull true filter', (done) => {
        testFilterQuery(
          { id: { isNull: true } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('String filter', () => {
      it('returns nodes with string eq filter', (done) => {
        testFilterQuery(
          { name: { eq: 'name5' } }, // Filter values
          20, // Requested limit
          [{ name: 'name5' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string notEq filter', (done) => {
        testFilterQuery(
          { name: { notEq: 'name0' } }, // Filter values
          5, // Requested limit
          [{ name: 'name1' }, { name: 'name2' }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string in filter', (done) => {
        testFilterQuery(
          { name: { in: ['name3', 'name5', 'name9', 'unknown'] } }, // Filter values
          5, // Requested limit
          [{ name: 'name3' }, { name: 'name5' }, { name: 'name9' }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string notIn filter', (done) => {
        testFilterQuery(
          { name: { notIn: ['name1', 'name2', 'name4', 'unknown'] } }, // Filter values
          5, // Requested limit
          [{ name: 'name0' }, { name: 'name3' }, { name: 'name5' }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string gt filter', (done) => {
        testFilterQuery(
          { name: { gt: 'name5' } }, // Filter values
          5, // Requested limit
          [{ name: 'name6' }, { name: 'name7' }, { name: 'name8' }], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string gte filter', (done) => {
        testFilterQuery(
          { name: { gte: 'name5' } }, // Filter values
          5, // Requested limit
          [{ name: 'name5' }, { name: 'name6' }, { name: 'name7' }], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string lt filter', (done) => {
        testFilterQuery(
          { name: { lt: 'name3' } }, // Filter values
          5, // Requested limit
          [{ name: 'name0' }, { name: 'name1' }, { name: 'name2' }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string lte filter', (done) => {
        testFilterQuery(
          { name: { lte: 'name3' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string isNull false filter', (done) => {
        testFilterQuery(
          { name: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string isNull false filter', (done) => {
        testFilterQuery(
          { name: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string isNull true filter', (done) => {
        testFilterQuery(
          { name: { isNull: true } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string startsWith filter', (done) => {
        testFilterQuery(
          { name: { startsWith: 'na' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
            { name: 'name4' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns no nodes with string startsWith filter and non existent string', (done) => {
        testFilterQuery(
          { name: { startsWith: 'nainvalid' } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string startsWith empty string filter', (done) => {
        testFilterQuery(
          { name: { startsWith: '' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
            { name: 'name4' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string startsWith filter and limited selection', (done) => {
        testFilterQuery(
          { name: { startsWith: 'name1' } }, // Filter values
          5, // Requested limit
          [{ name: 'name1' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      // Ends with
      it('returns nodes with string endsWith filter', (done) => {
        testFilterQuery(
          { name: { endsWith: '1' } }, // Filter values
          5, // Requested limit
          [{ name: 'name1' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns no nodes with string endsWith filter and non existent string', (done) => {
        testFilterQuery(
          { name: { endsWith: 'nainvalid' } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string endsWith empty string filter', (done) => {
        testFilterQuery(
          { name: { endsWith: '' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
            { name: 'name4' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string endsWith filter and limited selection', (done) => {
        testFilterQuery(
          { name: { endsWith: 'ame1' } }, // Filter values
          5, // Requested limit
          [{ name: 'name1' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      // Contains
      it('returns nodes with string contains filter', (done) => {
        testFilterQuery(
          { name: { contains: 'e1' } }, // Filter values
          5, // Requested limit
          [{ name: 'name1' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns no nodes with string contains filter and non existent string', (done) => {
        testFilterQuery(
          { name: { contains: 'nainvalid' } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string contains empty string filter', (done) => {
        testFilterQuery(
          { name: { contains: '' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
            { name: 'name4' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string contains filter and matching string', (done) => {
        testFilterQuery(
          { name: { contains: 'ame' } }, // Filter values
          5, // Requested limit
          [
            { name: 'name0' },
            { name: 'name1' },
            { name: 'name2' },
            { name: 'name3' },
            { name: 'name4' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Enum filter', () => {
      it('returns nodes with enum eq filter', (done) => {
        testFilterQuery(
          { userType: { eq: 'ADMIN' } }, // Filter values
          20, // Requested limit
          [{ userType: 'ADMIN' }, { userType: 'ADMIN' }, { userType: 'ADMIN' }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum notEq filter', (done) => {
        testFilterQuery(
          { userType: { notEq: 'ADMIN' } }, // Filter values
          5, // Requested limit
          [
            { userType: 'STAFF' },
            { userType: 'USER' },
            { userType: 'STAFF' },
            { userType: 'USER' },
            { userType: 'STAFF' },
          ], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum in filter', (done) => {
        testFilterQuery(
          { userType: { in: ['STAFF', 'ADMIN'] } }, // Filter values
          5, // Requested limit
          [
            { userType: 'ADMIN' },
            { userType: 'STAFF' },
            { userType: 'ADMIN' },
            { userType: 'STAFF' },
            { userType: 'ADMIN' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum notIn filter', (done) => {
        testFilterQuery(
          { userType: { notIn: ['STAFF', 'ADMIN'] } }, // Filter values
          5, // Requested limit
          [{ userType: 'USER' }, { userType: 'USER' }], // Expected values
          false, // Expect has next page
          2, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum gt filter', (done) => {
        testFilterQuery(
          { userType: { gt: 'STAFF' } }, // Filter values
          5, // Requested limit
          [{ userType: 'USER' }, { userType: 'USER' }], // Expected values
          false, // Expect has next page
          2, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum gte filter', (done) => {
        testFilterQuery(
          { userType: { gte: 'STAFF' } }, // Filter values
          5, // Requested limit
          [
            { userType: 'STAFF' },
            { userType: 'USER' },
            { userType: 'STAFF' },
            { userType: 'USER' },
            { userType: 'STAFF' },
          ], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum lt filter', (done) => {
        testFilterQuery(
          { userType: { lt: 'STAFF' } }, // Filter values
          5, // Requested limit
          [{ userType: 'ADMIN' }, { userType: 'ADMIN' }, { userType: 'ADMIN' }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum lte filter', (done) => {
        testFilterQuery(
          { userType: { lte: 'STAFF' } }, // Filter values
          5, // Requested limit
          [
            { userType: 'ADMIN' },
            { userType: 'STAFF' },
            { userType: 'ADMIN' },
            { userType: 'STAFF' },
            { userType: 'ADMIN' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum isNull false filter', (done) => {
        testFilterQuery(
          { userType: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { userType: 'ADMIN' },
            { userType: 'STAFF' },
            { userType: 'USER' },
            { userType: 'ADMIN' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with enum isNull true filter', (done) => {
        testFilterQuery(
          { userType: { isNull: true } }, // Filter values
          5, // Requested limit
          [{ userType: null }, { userType: null }], // Expected values
          false, // Expect has next page
          2, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Int filter', () => {
      it('returns nodes with int eq filter', (done) => {
        testFilterQuery(
          { intField: { eq: 5 } }, // Filter values
          20, // Requested limit
          [{ intField: 5 }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int notEq filter', (done) => {
        testFilterQuery(
          { intField: { notEq: 0 } }, // Filter values
          5, // Requested limit
          [{ intField: 1 }, { intField: 2 }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int in filter', (done) => {
        testFilterQuery(
          { intField: { in: [3, 5, 9, 5000] } }, // Filter values
          5, // Requested limit
          [{ intField: 3 }, { intField: 5 }, { intField: 9 }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int notIn filter', (done) => {
        testFilterQuery(
          { intField: { notIn: [1, 2, 4, 456987] } }, // Filter values
          5, // Requested limit
          [{ intField: 0 }, { intField: 3 }, { intField: 5 }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int gt filter', (done) => {
        testFilterQuery(
          { intField: { gt: 5 } }, // Filter values
          5, // Requested limit
          [{ intField: 6 }, { intField: 7 }, { intField: 8 }], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int gte filter', (done) => {
        testFilterQuery(
          { intField: { gte: 5 } }, // Filter values
          5, // Requested limit
          [{ intField: 5 }, { intField: 6 }, { intField: 7 }], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int lt filter', (done) => {
        testFilterQuery(
          { intField: { lt: 3 } }, // Filter values
          5, // Requested limit
          [{ intField: 0 }, { intField: 1 }, { intField: 2 }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int lte filter', (done) => {
        testFilterQuery(
          { intField: { lte: 3 } }, // Filter values
          5, // Requested limit
          [{ intField: 0 }, { intField: 1 }, { intField: 2 }, { intField: 3 }], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int isNull false filter', (done) => {
        testFilterQuery(
          { intField: { isNull: false } }, // Filter values
          5, // Requested limit
          [{ intField: 0 }, { intField: 1 }, { intField: 2 }, { intField: 3 }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with int isNull true filter', (done) => {
        testFilterQuery(
          { intField: { isNull: true } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Float filter', () => {
      it('returns nodes with float eq filter', (done) => {
        testFilterQuery(
          { floatField: { eq: 1005 } }, // Filter values
          20, // Requested limit
          [{ floatField: 1005 }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float notEq filter', (done) => {
        testFilterQuery(
          { floatField: { notEq: 1000 } }, // Filter values
          5, // Requested limit
          [{ floatField: 1001 }, { floatField: 1002 }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float in filter', (done) => {
        testFilterQuery(
          { floatField: { in: [1003, 1005, 1009, 1005000] } }, // Filter values
          5, // Requested limit
          [{ floatField: 1003 }, { floatField: 1005 }, { floatField: 1009 }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float notIn filter', (done) => {
        testFilterQuery(
          { floatField: { notIn: [1001, 1002, 1004, 100456987] } }, // Filter values
          5, // Requested limit
          [{ floatField: 1000 }, { floatField: 1003 }, { floatField: 1005 }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float gt filter', (done) => {
        testFilterQuery(
          { floatField: { gt: 1005 } }, // Filter values
          5, // Requested limit
          [{ floatField: 1006 }, { floatField: 1007 }, { floatField: 1008 }], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float gte filter', (done) => {
        testFilterQuery(
          { floatField: { gte: 1005 } }, // Filter values
          5, // Requested limit
          [{ floatField: 1005 }, { floatField: 1006 }, { floatField: 1007 }], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float lt filter', (done) => {
        testFilterQuery(
          { floatField: { lt: 1003 } }, // Filter values
          5, // Requested limit
          [{ floatField: 1000 }, { floatField: 1001 }, { floatField: 1002 }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float lte filter', (done) => {
        testFilterQuery(
          { floatField: { lte: 1003 } }, // Filter values
          5, // Requested limit
          [
            { floatField: 1000 },
            { floatField: 1001 },
            { floatField: 1002 },
            { floatField: 1003 },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float isNull false filter', (done) => {
        testFilterQuery(
          { floatField: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { floatField: 1000 },
            { floatField: 1001 },
            { floatField: 1002 },
            { floatField: 1003 },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with float isNull true filter', (done) => {
        testFilterQuery(
          { floatField: { isNull: true } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Boolean filter', () => {
      it('returns nodes with bool true filter', (done) => {
        testFilterQuery(
          { even: true }, // Filter values
          20, // Requested limit
          [
            { even: true, name: 'name2' },
            { even: true, name: 'name4' },
            { even: true, name: 'name6' },
            { even: true, name: 'name8' },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with bool false filter', (done) => {
        testFilterQuery(
          { even: false }, // Filter values
          20, // Requested limit
          [
            { even: false, name: 'name1' },
            { even: false, name: 'name3' },
            { even: false, name: 'name5' },
            { even: false, name: 'name7' },
          ], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with bool NULL filter', (done) => {
        testFilterQuery(
          { even: null }, // Filter values
          20, // Requested limit
          [{ even: null, name: 'name0' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('DateTime filter', () => {
      it('returns nodes with dateTime eq filter', (done) => {
        testFilterQuery(
          { dateTimeField: { eq: '2005-01-01T00:00:00.000Z' } }, // Filter values
          20, // Requested limit
          [{ dateTimeField: '2005-01-01T00:00:00.000Z' }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime notEq filter', (done) => {
        testFilterQuery(
          { dateTimeField: { notEq: '2000-01-01T00:00:00.000Z' } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2001-01-01T00:00:00.000Z' },
            { dateTimeField: '2002-01-01T00:00:00.000Z' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime in filter', (done) => {
        testFilterQuery(
          {
            dateTimeField: {
              in: [
                '2003-01-01T00:00:00.000Z',
                '2005-01-01T00:00:00.000Z',
                '2009-01-01T00:00:00.000Z',
                '2008-01-01T00:00:00.001Z',
              ],
            },
          }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2003-01-01T00:00:00.000Z' },
            { dateTimeField: '2005-01-01T00:00:00.000Z' },
            { dateTimeField: '2009-01-01T00:00:00.000Z' },
          ], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime notIn filter', (done) => {
        testFilterQuery(
          {
            dateTimeField: {
              notIn: [
                '2001-01-01T00:00:00.000Z',
                '2002-01-01T00:00:00.000Z',
                '2004-01-01T00:00:00.000Z',
                '2005-01-01T00:00:00.001Z',
              ],
            },
          }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2000-01-01T00:00:00.000Z' },
            { dateTimeField: '2003-01-01T00:00:00.000Z' },
            { dateTimeField: '2005-01-01T00:00:00.000Z' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime gt filter', (done) => {
        testFilterQuery(
          { dateTimeField: { gt: '2005-01-01T00:00:00.000Z' } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2006-01-01T00:00:00.000Z' },
            { dateTimeField: '2007-01-01T00:00:00.000Z' },
            { dateTimeField: '2008-01-01T00:00:00.000Z' },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime gte filter', (done) => {
        testFilterQuery(
          { dateTimeField: { gte: '2005-01-01T00:00:00.000Z' } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2005-01-01T00:00:00.000Z' },
            { dateTimeField: '2006-01-01T00:00:00.000Z' },
            { dateTimeField: '2007-01-01T00:00:00.000Z' },
          ], // Expected values
          false, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime lt filter', (done) => {
        testFilterQuery(
          { dateTimeField: { lt: '2003-01-01T00:00:00.000Z' } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2000-01-01T00:00:00.000Z' },
            { dateTimeField: '2001-01-01T00:00:00.000Z' },
            { dateTimeField: '2002-01-01T00:00:00.000Z' },
          ], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime lte filter', (done) => {
        testFilterQuery(
          { dateTimeField: { lte: '2003-01-01T00:00:00.000Z' } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2000-01-01T00:00:00.000Z' },
            { dateTimeField: '2001-01-01T00:00:00.000Z' },
            { dateTimeField: '2002-01-01T00:00:00.000Z' },
            { dateTimeField: '2003-01-01T00:00:00.000Z' },
          ], // Expected values
          false, // Expect has next page
          4, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime isNull false filter', (done) => {
        testFilterQuery(
          { dateTimeField: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { dateTimeField: '2000-01-01T00:00:00.000Z' },
            { dateTimeField: '2001-01-01T00:00:00.000Z' },
            { dateTimeField: '2002-01-01T00:00:00.000Z' },
            { dateTimeField: '2003-01-01T00:00:00.000Z' },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with dateTime isNull true filter', (done) => {
        testFilterQuery(
          { dateTimeField: { isNull: true } }, // Filter values
          5, // Requested limit
          [], // Expected values
          false, // Expect has next page
          0, // Expected result node count
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Connection field filter', () => {
      it('filters by scalar filter on connected node with exists filter', (done) => {
        async function runTest() {
          await testFilterQuery(
            {
              groups: { node: { users: { node: { name: { eq: 'name1' } } } } },
            }, // Filter values
            5, // Requested limit
            [
              { name: 'name0' },
              { name: 'name1' },
              { name: 'name2' },
              { name: 'name3' },
              { name: 'name4' },
            ], // Expected values
            true, // Expect has next page
            5, // Expected result node count
            context
          );

          await testFilterQuery(
            {
              groups: {
                node: { users: { node: { name: { eq: 'name1000' } } } },
              },
            }, // Filter values
            5, // Requested limit
            [], // Expected values
            false, // Expect has next page
            0, // Expected result node count
            context
          );

          await testFilterQuery(
            {
              groups: {
                node: { users: { node: { name: { notEq: 'name1000' } } } },
              },
            }, // Filter values
            5, // Requested limit
            [
              { name: 'name0' },
              { name: 'name1' },
              { name: 'name2' },
              { name: 'name3' },
              { name: 'name4' },
            ], // Expected values
            true, // Expect has next page
            5, // Expected result node count
            context
          );

          // @TODO: Test for more filters
        }
        runTest().then(done).catch(done);
      });
    });
  });

  describe('Connection ordering', () => {
    describe('ID ordering', () => {
      it('returns nodes with ID eq filter, ignores ordering', (done) => {
        testFilterQuery(
          { id: { eq: userIds[5] } }, // Filter values
          20, // Requested limit
          [{ id: userIds[5] }], // Expected values
          false, // Expect has next page
          1, // Expected result node count
          context,
          {
            fields: ['id'],
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID notEq filter, ordering ASC', (done) => {
        testFilterQuery(
          { id: { notEq: userIds[0] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[1] }, { id: userIds[2] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['id'],
            direction: 'ASC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID notEq filter, ordering DESC', (done) => {
        testFilterQuery(
          { id: { notEq: userIds[8] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[9] }, { id: userIds[7] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['id'],
            direction: 'DESC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID in filter, order ASC', (done) => {
        testFilterQuery(
          { id: { in: [userIds[3], userIds[5], userIds[9], 'invalid'] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[3] }, { id: userIds[5] }, { id: userIds[9] }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context,
          {
            fields: ['id'],
            direction: 'ASC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID in filter, order DESC', (done) => {
        testFilterQuery(
          { id: { in: [userIds[3], userIds[5], userIds[9], 'invalid'] } }, // Filter values
          5, // Requested limit
          [{ id: userIds[9] }, { id: userIds[5] }, { id: userIds[3] }], // Expected values
          false, // Expect has next page
          3, // Expected result node count
          context,
          {
            fields: ['id'],
            direction: 'DESC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID as first, other as secondary ordering DESC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [{ id: userIds[9] }, { id: userIds[8] }, { id: userIds[7] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['id', 'name'],
            direction: 'DESC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ID as first, other as secondary ordering ASC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [{ id: userIds[0] }, { id: userIds[1] }, { id: userIds[2] }], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['id', 'name'],
            direction: 'ASC',
          } // Order by
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and ordering', (done) => {
        testOrderedPagination(['id'], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], context)
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and multi field ordering', (done) => {
        testOrderedPagination(
          ['id', 'name'],
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('String ordering', () => {
      it('returns nodes with string ordering ASC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[3] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[1] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['nameOrder'],
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with string ordering DESC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[8] },
            { id: userIds[5] },
            { id: userIds[2] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['nameOrder'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + string ordering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[7] },
            { id: userIds[4] },
            { id: userIds[1] },
            { id: userIds[9] },
            { id: userIds[6] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['nameOrder'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + string ordering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder0' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[1] },
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[2] },
            { id: userIds[5] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['nameOrder'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + string ordering and secondary filtering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[1] },
            { id: userIds[0] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[3] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['nameOrder', 'even'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + string ordering and secondary filtering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[3] },
            { id: userIds[9] },
            { id: userIds[6] },
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['nameOrder', 'even'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and ordering', (done) => {
        testOrderedPagination(
          ['nameOrder'],
          [0, 3, 6, 9, 1, 4, 7, 2, 5, 8],
          context
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and multi field ordering', (done) => {
        testOrderedPagination(
          ['nameOrder', 'even'],
          [3, 9, 6, 0, 1, 7, 4, 5, 2, 8],
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('DateTime ordering', () => {
      it('returns nodes with ordering ASC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[3] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[1] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField'],
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ordering DESC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[8] },
            { id: userIds[5] },
            { id: userIds[2] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[7] },
            { id: userIds[4] },
            { id: userIds[1] },
            { id: userIds[9] },
            { id: userIds[6] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder0' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[1] },
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[2] },
            { id: userIds[5] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[1] },
            { id: userIds[0] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[3] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField', 'even'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[3] },
            { id: userIds[9] },
            { id: userIds[6] },
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['dateTimeOrderField', 'even'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and ordering', (done) => {
        testOrderedPagination(
          ['dateTimeOrderField'],
          [0, 3, 6, 9, 1, 4, 7, 2, 5, 8],
          context
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and multi field ordering', (done) => {
        testOrderedPagination(
          ['dateTimeOrderField', 'even'],
          [3, 9, 6, 0, 1, 7, 4, 5, 2, 8],
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Float ordering', () => {
      it('returns nodes with ordering ASC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[3] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[1] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['floatOrderField'],
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ordering DESC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[8] },
            { id: userIds[5] },
            { id: userIds[2] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['floatOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[7] },
            { id: userIds[4] },
            { id: userIds[1] },
            { id: userIds[9] },
            { id: userIds[6] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['floatOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder0' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[1] },
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[2] },
            { id: userIds[5] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['floatOrderField'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[1] },
            { id: userIds[0] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[3] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['floatOrderField', 'even'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[3] },
            { id: userIds[9] },
            { id: userIds[6] },
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['floatOrderField', 'even'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and ordering', (done) => {
        testOrderedPagination(
          ['floatOrderField'],
          [0, 3, 6, 9, 1, 4, 7, 2, 5, 8],
          context
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and multi field ordering', (done) => {
        testOrderedPagination(
          ['floatOrderField', 'even'],
          [3, 9, 6, 0, 1, 7, 4, 5, 2, 8],
          context
        )
          .then(done)
          .catch(done);
      });
    });

    describe('Int ordering', () => {
      it('returns nodes with ordering ASC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[0] },
            { id: userIds[3] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[1] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['intOrderField'],
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with ordering DESC', (done) => {
        testFilterQuery(
          { id: { isNull: false } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[8] },
            { id: userIds[5] },
            { id: userIds[2] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['intOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[7] },
            { id: userIds[4] },
            { id: userIds[1] },
            { id: userIds[9] },
            { id: userIds[6] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['intOrderField'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder0' } }, // Filter values
          5, // Requested limit
          [
            { id: userIds[1] },
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[2] },
            { id: userIds[5] },
          ], // Expected values
          true, // Expect has next page
          5, // Expected result node count
          context,
          {
            fields: ['intOrderField'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering DESC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[4] },
            { id: userIds[7] },
            { id: userIds[1] },
            { id: userIds[0] },
            { id: userIds[6] },
            { id: userIds[9] },
            { id: userIds[3] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['intOrderField', 'even'],
            direction: 'DESC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('returns nodes with filter on same field + ordering and secondary filtering ASC', (done) => {
        testFilterQuery(
          { nameOrder: { notEq: 'nameOrder2' } }, // Filter values
          7, // Requested limit
          [
            { id: userIds[3] },
            { id: userIds[9] },
            { id: userIds[6] },
            { id: userIds[0] },
            { id: userIds[1] },
            { id: userIds[7] },
            { id: userIds[4] },
          ], // Expected values
          false, // Expect has next page
          7, // Expected result node count
          context,
          {
            fields: ['intOrderField', 'even'],
            direction: 'ASC',
          } // Order By
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and ordering', (done) => {
        testOrderedPagination(
          ['intOrderField'],
          [0, 3, 6, 9, 1, 4, 7, 2, 5, 8],
          context
        )
          .then(done)
          .catch(done);
      });

      it('handles pagination with cursor and multi field ordering', (done) => {
        testOrderedPagination(
          ['intOrderField', 'even'],
          [3, 9, 6, 0, 1, 7, 4, 5, 2, 8],
          context
        )
          .then(done)
          .catch(done);
      });
    });
  });

  describe('1:1 Connection', () => {
    it('returns one related node', (done) => {
      async function runTest() {
        const result = await executeQuery(
          `
          query (
            $id: ID!
          ) {
            node(id: $id) {
              ... on User {
                profile {
                  id
                  profileText
                }
              }
            }
          }`,
          context,
          { id: userIds[0] }
        );
        expect(result.node.profile).to.not.be.null;
        expect(result.node.profile.profileText).to.equal('profile1');
      }
      runTest().then(done).catch(done);
    });

    it('returns a list of related nodes', (done) => {
      async function runTest() {
        const result = await executeQuery(
          `
          query {
            users(first: 5) {
              edges {
                node {
                  profile {
                    profileText
                  }
                }
              }
            }
          }`,
          context
        );
        expect(result.users).to.not.equal(null);
        expect(result.users.edges.length).to.equal(5);
        _.range(4).forEach((index) => {
          expect(result.users.edges[index].node.profile.profileText).to.equal(
            'profile' + (index + 1)
          );
        });
      }
      runTest().then(done).catch(done);
    });

    it('returns one related node via EdgeType', (done) => {
      async function runTest() {
        const result = await executeQuery(
          `
          query (
            $id: ID!
          ) {
            node(id: $id) {
              ... on User {
                foreignUser {
                  userName
                }
              }
            }
          }`,
          context,
          { id: userIds[0] }
        );
        expect(result.node.foreignUser).to.not.be.null;
        expect(result.node.foreignUser.userName).to.equal('username0');
      }
      runTest().then(done).catch(done);
    });

    it('returns a list of related nodes via EdgeType', (done) => {
      async function runTest() {
        const result = await executeQuery(
          `
          query {
            users(first: 6) {
              edges {
                node {
                  foreignUser {
                    userName
                  }
                }
              }
            }
          }`,
          context
        );
        expect(result.users).to.not.equal(null);
        expect(result.users.edges.length).to.equal(6);
        _.range(5).forEach((index) => {
          expect(result.users.edges[index].node.foreignUser.userName).to.equal(
            'username' + index
          );
        });
        expect(result.users.edges[5].node.foreignUser).to.equal(null);
      }
      runTest().then(done).catch(done);
    });
  });
});
