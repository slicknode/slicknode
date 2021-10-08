import { ModuleConfig } from '../../../../definition';
import {
  buildModules,
  createTestContext,
  createTestUser,
  destroyTestContext,
  executeQuery,
  TestUser,
} from '../../../../test/utils';
import path from 'path';
import Context from '../../../../context';
import { Role } from '../../../../auth';
import chai, { expect } from 'chai';
import { getHistoryTypeName } from '../../../identifiers';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

const CREATE_USER_MUTATION = `
  mutation C($input: Test_createUserInput!) {
    createUser: Test_createUser(input: $input) {
      node {
        id
        stringUnique
        stringRequired
        string
        status {
          name
        }
        locale {
          code
        }
        contentNode {
          id
        }
        childrenList {
          id
          stringRequired
        }
        createdBy {
          id
        }
        createdAt
        lastUpdatedAt
        lastUpdatedBy {
          id
        }
        section {
          ...on Test_Section1 {
            name
          }
          ...on Test_Section2 {
            name
          }
        }
        sections {
          ...on Test_Section1 {
            name
          }
          ...on Test_Section2 {
            name
          }
        }
        _localizations {
          edges {
            node {
              stringRequired
              locale {
                code
              }
            }
          }
        }
      }
    }
  }
`;

const UPDATE_USER_MUTATION = `
  mutation C($input: Test_updateUserInput!) {
    updateUser: Test_updateUser(input: $input) {
      node {
        id
        stringUnique
        stringRequired
        string
        status {
          name
        }
        locale {
          code
        }
        contentNode {
          id
        }
        createdBy {
          id
        }
        parent {
          id
          contentNode {
            id
          }
        }
        createdAt
        lastUpdatedAt
        lastUpdatedBy {
          id
        }
        _versions {
          edges {
            node {
              stringRequired
              lastUpdatedAt
              lastUpdatedBy {
                id
              }
            }
          }
        }
      }
    }
  }
`;

const DELETE_USER_MUTATION = `
  mutation C($input: Test_deleteUserInput!) {
    deleteUser: Test_deleteUser(input: $input) {
      node {
        id
        stringUnique
        stringRequired
        string
        status {
          name
        }
        locale {
          code
        }
        contentNode {
          id
        }
        createdBy {
          id
        }
        createdAt
        lastUpdatedAt
        lastUpdatedBy {
          id
        }
      }
    }
  }
`;

const PUBLISH_USER_MUTATION = `
  mutation C($input: Test_publishUserInput!) {
    publishUser: Test_publishUser(input: $input) {
      nodes {
        id
        stringUnique
        stringRequired
        string
        status {
          name
        }
        locale {
          code
        }
        contentNode {
          id
        }
        _localizations {
          edges {
            node {
              stringRequired
              locale {
                code
              }
            }
          }
        }
        _versions {
          edges {
            node {
              stringRequired
              publishedAt
            }
          }
        }
      }
    }
  }
`;

const UNPUBLISH_USER_MUTATION = `
  mutation C($input: Test_unpublishUserInput!) {
    unpublishUser: Test_unpublishUser(input: $input) {
      nodes {
        id
        stringUnique
        stringRequired
        string
        status {
          name
        }
        locale {
          code
        }
        contentNode {
          id
        }
        _localizations {
          edges {
            node {
              stringRequired
              locale {
                code
              }
            }
          }
        }
        _versions {
          edges {
            node {
              stringRequired
              publishedAt
            }
          }
        }
      }
    }
  }
`;

const GET_USER_BY_CONTENT_NODE = `
  query Q($id: ID!, $preview: Boolean, $locale: String) {
    user: Test_getUserByContentNode(contentNode: $id, preview: $preview, locale: $locale) {
      id
      stringUnique
      stringRequired
      string
      status {
        name
      }
      locale {
        code
      }
    }
  }
`;

const GET_USERS = `
  query Q($preview: Boolean, $locale: String) {
    users: Test_listUser(preview: $preview, locale: $locale) {
      totalCount
      edges {
        node {
          id
          stringUnique
          stringRequired
          string
          publishedAt
          publishedBy {
            id
          }
          status {
            name
          }
          locale {
            code
          }
        }
      }
    }
  }
`;

const CREATE_SECTION1 = `
mutation M($input: Test_createSection1Input!) {
  section: Test_createSection1(input: $input) {
    node {
      id
      name
      contentNode {id}
    }
  }
}
`;

const CREATE_SECTION2 = `
mutation M($input: Test_createSection2Input!) {
  section: Test_createSection2(input: $input) {
    node {
      id
      name
      contentNode {id}
    }
  }
}
`;
const CREATE_FRIEND_CONTENT = `
mutation M($input: Test_createFriendContentInput!) {
  Test_createFriendContent(input: $input) {
    node {
      id
    }
  }
}
`;

describe('ContentNode PostgresHandler test', () => {
  let context: Context;
  let staffUser: TestUser;
  let adminUser: TestUser;

  beforeEach(async () => {
    // Setup schema and base data
    const modules = await getModules('content-node-full-schema');
    context = await createTestContext(modules);
    staffUser = await createTestUser([Role.STAFF, Role.ANONYMOUS], context);
    adminUser = await createTestUser([Role.ADMIN, Role.ANONYMOUS], context);
    await createContentBaseTypes(context);
  });

  afterEach(async () => {
    await destroyTestContext(context);
  });

  it('loads union type for anonymous user', async () => {
    let result = await executeQuery(
      CREATE_SECTION1,
      context,
      {
        input: {
          name: 'Section1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const section1 = result.section.node;
    result = await executeQuery(
      CREATE_SECTION2,
      context,
      {
        input: {
          name: 'Section2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const section2 = result.section.node;

    try {
      result = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'German Original',
            locale: 'de-DE',
            section: section1.contentNode.id,
            sections: [section1.contentNode.id, section2.contentNode.id],
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
    } catch (e) {
      console.log(e);
    }

    result = await executeQuery(
      `query Q($preview: Boolean, $locale: String) {
      users: Test_listUser(preview: $preview, locale: $locale) {
        totalCount
        edges {
          node {
            sections {
              ...on Test_Section1 {
                name
              }
              ...on Test_Section2 {
                name
              }
            }
            locale {
              code
            }
          }
        }
      }
    }`,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: {
          uid: null,
          roles: [Role.ANONYMOUS],
          write: false,
        },
      }
    );

    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.sections).to.deep.equal([
      { name: 'Section1' },
      { name: 'Section2' },
    ]);
  });

  it('loads one-to-many relation via non-content node', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user1 = result.createUser.node;
    result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user2 = result.createUser.node;

    const manager = await context.db.Test_Manager.create({
      manager: context.fromGlobalId(user1.contentNode.id).id,
      user: context.fromGlobalId(user2.contentNode.id).id,
    });

    const loadManagersQuery = `query Q($id: ID!){
      user: Test_getUserById(id: $id, preview: true) {
        manager {
          id
        }
        employees {
          edges {
            node {id}
          }
        }
      }
    }`;
    // Load relations for manager
    result = await executeQuery(
      loadManagersQuery,
      context,
      { id: user1.id },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user.manager).to.equal(null);
    expect(result.user.employees.edges.length).to.equal(1);

    // Load relations for employee
    result = await executeQuery(
      loadManagersQuery,
      context,
      { id: user2.id },
      {
        authContext: staffUser.auth,
      }
    );

    expect(result.user.manager.id).to.equal(user1.id);
    expect(result.user.employees.edges.length).to.equal(0);
  });

  it('loads many-to-many relation via non-content node', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user1 = result.createUser.node;
    result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user2 = result.createUser.node;

    await context.db.Test_Friend.create({
      user: context.fromGlobalId(user1.contentNode.id).id,
      friend: context.fromGlobalId(user2.contentNode.id).id,
    });

    result = await executeQuery(
      `query Q($id: ID!){
      user: Test_getUserById(id: $id, preview: true) {
        friends {
          edges {
            node {
              id
              stringRequired
            }
          }
        }
      }
    }`,
      context,
      { id: user1.id },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user.friends.edges.length).to.equal(1);
    expect(result.user.friends.edges[0].node.id).to.equal(user2.id);
  });

  it('loads many-to-many relation via content node', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user1 = result.createUser.node;
    result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'User 2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user2 = result.createUser.node;

    result = await executeQuery(
      CREATE_FRIEND_CONTENT,
      context,
      {
        input: {
          user: user1.contentNode.id,
          friend: user2.contentNode.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    result = await executeQuery(
      `query Q($id: ID!){
      user: Test_getUserById(id: $id, preview: true) {
        friends: friendsContent {
          edges {
            node {
              id
              stringRequired
            }
          }
        }
      }
    }`,
      context,
      { id: user1.id },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user.friends.edges.length).to.equal(1);
    expect(result.user.friends.edges[0].node.id).to.equal(user2.id);
  });

  it('updates status when updating published node', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'Parent',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );

    let result2 = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result2.publishUser.nodes[0].status.name).to.equal('PUBLISHED');

    const updateResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: result.createUser.node.id,
          parent: user.contentNode.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(updateResult.updateUser.node.status.name).to.equal('DRAFT');
  });

  it('updates node and changes preview context', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'Parent',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );

    let result2 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'Child',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const updateResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: result2.createUser.node.id,
          parent: user.contentNode.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(updateResult.updateUser.node.parent.id).to.equal(user.id);
  });

  it('unpublishes nodes from published storage only', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    let published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { nodes } = published.publishUser;
    expect(nodes.length).to.equal(1);
    expect(nodes[0].stringRequired).to.equal('German Original');

    // Load user for published
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    let deleted = await executeQuery(
      UNPUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    context.clearCache();

    // Load user for published, check if deleted
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('0');
    expect(result.users.edges.length).to.equal(0);

    // Load user for preview, check if still exists
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);

    const node = result.users.edges[0].node;
    // Check status was set back to draft
    expect(node.status.name).to.equal('DRAFT');
    expect(node.publishedAt).to.equal(null);
    expect(node.publishedBy).to.equal(null);
  });

  it('applies permission query fields on "unpublish" mutation', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    let published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { nodes } = published.publishUser;
    expect(nodes.length).to.equal(1);
    expect(nodes[0].stringRequired).to.equal('German Original');

    // Load user for published
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    // Create other staff user
    const testUser = await createTestUser(
      [Role.ADMIN, Role.AUTHENTICATED],
      context
    );

    await expect(
      executeQuery(
        UNPUBLISH_USER_MUTATION,
        context,
        {
          input: {
            ids: [user.id],
          },
        },
        {
          authContext: testUser.auth,
        }
      )
    ).to.eventually.rejectedWith(
      "You don't have permission to unpublish the content items"
    );
    context.clearCache();

    // Load user for published, check if deleted
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);

    // Load user for preview, check if still exists
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);

    const node = result.users.edges[0].node;

    // Check status was set back to draft
    expect(node.status.name).to.equal('PUBLISHED');
    expect(node.publishedAt).to.be.string;
    expect(node.publishedBy.id).to.be.string;
  });

  it('deletes complete nodes from published + preview storage', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    let published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { nodes } = published.publishUser;
    expect(nodes.length).to.equal(1);
    expect(nodes[0].stringRequired).to.equal('German Original');

    // Check if history is deleted
    let history = await context.db[getHistoryTypeName('Test_User')].fetchAll();
    expect(history.length).to.equal(1);

    // Load user for published
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    let deleted = await executeQuery(
      DELETE_USER_MUTATION,
      context,
      {
        input: {
          id: user.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    context.clearCache();

    // Load user for published, check if deleted
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('0');
    expect(result.users.edges.length).to.equal(0);

    // Load user for preview, check if deleted
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('0');
    expect(result.users.edges.length).to.equal(0);

    // Check if history is deleted
    history = await context.db[getHistoryTypeName('Test_User')].fetchAll();
    expect(history).to.deep.equal([]);
  });

  it('saves and loads content union types', async () => {
    let result = await executeQuery(
      CREATE_SECTION1,
      context,
      {
        input: {
          name: 'Section1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const section1 = result.section.node;
    result = await executeQuery(
      CREATE_SECTION2,
      context,
      {
        input: {
          name: 'Section2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const section2 = result.section.node;

    try {
      result = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'German Original',
            locale: 'de-DE',
            section: section1.contentNode.id,
            sections: [section1.contentNode.id, section2.contentNode.id],
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
    } catch (e) {
      console.log(e);
    }

    let user = result.createUser.node;
    expect(user.section.name).to.equal('Section1');
    expect(user.sections.length).to.equal(2);
    expect(user.sections[0].name).to.equal('Section1');
    expect(user.sections[1].name).to.equal('Section2');
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');
  });

  it('returns nodes in connection for locale / preview', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('1');
    expect(result.users.edges.length).to.equal(1);
    expect(result.users.edges[0].node.locale.code).to.equal('de-DE');

    // Load for non preview
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('0');
    expect(result.users.edges.length).to.equal(0);

    // Load for preview, different locale
    result = await executeQuery(
      GET_USERS,
      context,
      {
        preview: true,
        locale: 'en',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.users.totalCount).to.equal('0');
    expect(result.users.edges.length).to.equal(0);
  });

  it('returns node by contentNode ID', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    // Load user for preview
    result = await executeQuery(
      GET_USER_BY_CONTENT_NODE,
      context,
      {
        id: user.contentNode.id,
        preview: true,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user.id).to.equal(user.id);
    expect(result.user.status.name).to.equal('DRAFT');

    // Load user for published status (NULL)
    result = await executeQuery(
      GET_USER_BY_CONTENT_NODE,
      context,
      {
        id: user.contentNode.id,
        preview: false,
        locale: 'de-DE',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user).to.equal(null);

    // Load user for different locale
    result = await executeQuery(
      GET_USER_BY_CONTENT_NODE,
      context,
      {
        id: user.contentNode.id,
        preview: true,
        locale: 'en',
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(result.user).to.equal(null);
  });

  it('loads other translations via _localizations connection', async () => {
    let result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English Original',
          locale: 'en',
          contentNode: user.contentNode.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
    context.clearCache();

    expect(user._localizations.edges.length).to.equal(2);
    expect(user._localizations.edges[0].node.stringRequired).to.equal(
      'German Original'
    );
    expect(user._localizations.edges[0].node.locale.code).to.equal('de-DE');

    expect(user._localizations.edges[1].node.stringRequired).to.equal(
      'English Original'
    );
    expect(user._localizations.edges[1].node.locale.code).to.equal('en');
  });

  it('writes to history table on publish to non-preview', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );

    // Now publish
    let publishResult = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // On first publish history entry is added
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    let publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(1);
    context.clearCache();

    // Now publish again
    publishResult = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // On first publish we don't have history version yet
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(2);
    context.clearCache();

    // Now publish again
    publishResult = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // On first publish we don't have history version yet
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(3);
    expect(publishedNode._versions.edges[0].node.stringRequired).to.equal(
      'German Original'
    );
    expect(publishedNode._versions.edges[0].node.publishedAt).to.not.equal(
      publishedNode._versions.edges[1].node.publishedAt
    );
  });

  it('writes to history table on update to preview', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );

    // Now publish
    const updateResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: user.id,
          stringRequired: 'German Updated',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // History entry is added on save
    expect(updateResult.updateUser.node.id).to.equal(user.id);
    let publishedNode = updateResult.updateUser.node;
    expect(publishedNode._versions.edges.length).to.equal(1);
    context.clearCache();

    // Now publish again
    let publishResult = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // On first publish we don't have history version yet
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(2);
    context.clearCache();

    expect(publishedNode._versions.edges[0].node.stringRequired).to.equal(
      'German Original'
    );
    expect(publishedNode._versions.edges[1].node.stringRequired).to.equal(
      'German Updated'
    );
  });

  it('removes old entries from history table', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );

    // Now publish
    let publishResult = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [user.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // On first publish we don't have history version yet
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    let publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(1);
    context.clearCache();

    // Now publish again LIMIT + 1 times
    for (let i = 0; i < 13; i++) {
      publishResult = await executeQuery(
        PUBLISH_USER_MUTATION,
        context,
        {
          input: {
            ids: [user.id],
            status: 'PUBLISHED',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      context.clearCache();
    }

    // On first publish we don't have history version yet
    expect(publishResult.publishUser.nodes.length).to.equal(1);
    publishedNode = publishResult.publishUser.nodes[0];
    expect(publishedNode._versions.edges.length).to.equal(10);
    expect(publishedNode._versions.edges[0].node.stringRequired).to.equal(
      'German Original'
    );
    expect(publishedNode._versions.edges[0].node.publishedAt).to.not.equal(
      publishedNode._versions.edges[1].node.publishedAt
    );
  });

  it('sets automatic values for createdBy, createdAt', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const user = result.createUser.node;
    expect(user.createdAt).to.not.equal(null);
    expect(user.createdBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
  });

  it('sets automatic values for lastUpdatedBy, lastUpdatedAt', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    let user = result.createUser.node;
    expect(user.lastUpdatedAt).to.equal(null);
    expect(user.lastUpdatedBy).to.equal(null);

    // Run update
    const updateResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: user.id,
          stringRequired: 'German Original',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    user = updateResult.updateUser.node;
    expect(user.lastUpdateAt).to.not.equal(null);
    expect(new Date(user.lastUpdatedAt).getTime()).to.below(
      new Date().getTime() + 1
    );
    expect(user.lastUpdatedBy.id).to.equal(
      context.toGlobalId('User', staffUser.auth.uid)
    );
  });

  it('publishes ContentItem to REVIEW status', async () => {
    const related = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const addedId = context.fromGlobalId(related.createUser.node.id).id;

    // Check if is in draft status
    let previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: true,
      }
    );
    expect(previewUser.stringRequired).to.equal('German Original');

    // Check user is not in published status
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(previewUser).to.equal(null);

    let published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [related.createUser.node.id],
          status: 'REVIEW',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { nodes } = published.publishUser;
    expect(nodes.length).to.equal(1);
    expect(nodes[0].stringRequired).to.equal('German Original');

    // Check user is in published status
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(previewUser).to.equal(null);

    // Update preview status
    const updateUserResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: related.createUser.node.id,
          stringRequired: 'German Updated',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const updateUser = updateUserResult.updateUser.node;
    expect(updateUser.stringRequired).to.equal('German Updated');

    // Load from preview storage, ensure it's updated
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: true,
      }
    );
    expect(previewUser.stringRequired).to.equal('German Updated');

    // Load from published storage, ensure it's not updated
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(previewUser).to.equal(null);

    // Republish, overwriting existing published node
    published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [related.createUser.node.id],
          status: 'REVIEW',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(published.publishUser.nodes.length).to.equal(1);
    expect(published.publishUser.nodes[0].stringRequired).to.equal(
      'German Updated'
    );

    // Load from DB published storage
    let publishedUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(publishedUser).to.equal(null);
  });

  it('publishes ContentItem to PUBLISHED status', async () => {
    const related = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const addedId = context.fromGlobalId(related.createUser.node.id).id;

    // Check if is in draft status
    let previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: true,
      }
    );
    expect(previewUser.stringRequired).to.equal('German Original');

    // Check user is not in published status
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(previewUser).to.equal(null);

    let published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [related.createUser.node.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { nodes } = published.publishUser;
    expect(nodes.length).to.equal(1);
    expect(nodes[0].stringRequired).to.equal('German Original');

    // Check user is now in published status
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    const firstPublishedAt = previewUser.publishedAt.getTime();
    expect(previewUser.stringRequired).to.equal('German Original');
    expect(firstPublishedAt).to.above(new Date().getTime() - 2000);
    expect(previewUser.publishedBy).to.equal(staffUser.user.id);

    // Update preview status
    const updateUserResult = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          id: related.createUser.node.id,
          stringRequired: 'German Updated',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const updateUser = updateUserResult.updateUser.node;
    expect(updateUser.stringRequired).to.equal('German Updated');

    // Load from preview storage, ensure it's updated
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: true,
      }
    );
    expect(previewUser.stringRequired).to.equal('German Updated');

    // Load from published storage, ensure it's not updated
    previewUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(previewUser.stringRequired).to.equal('German Original');

    // Republish, overwriting existing published node
    published = await executeQuery(
      PUBLISH_USER_MUTATION,
      context,
      {
        input: {
          ids: [related.createUser.node.id],
          status: 'PUBLISHED',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(published.publishUser.nodes.length).to.equal(1);
    expect(published.publishUser.nodes[0].stringRequired).to.equal(
      'German Updated'
    );

    // Load from DB published storage
    let publishedUser = await context.db.Test_User.find(
      {
        id: addedId,
      },
      {
        preview: false,
      }
    );
    expect(publishedUser.stringRequired).to.equal('German Updated');
    expect(publishedUser.publishedAt.getTime()).to.above(
      new Date().getTime() - 2000
    );
    expect(publishedUser.publishedBy).to.equal(staffUser.user.id);

    // Test published time was updated
    expect(publishedUser.publishedAt.getTime()).to.not.equal(firstPublishedAt);
  });

  it('performs CRUD mutations for draft state with default language', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    expect(result.createUser.node.status.name).to.equal('DRAFT');
    expect(result.createUser.node.locale.code).to.equal('en');
  });

  it('performs CRUD mutations for draft state with non default locale', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    expect(result.createUser.node.status.name).to.equal('DRAFT');
    expect(result.createUser.node.locale.code).to.equal('de-DE');

    const id = context.fromGlobalId(result.createUser.node.id).id;
  });

  it('writes node via create mutation to PREVIEW storage', async () => {
    const result = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const id = context.fromGlobalId(result.createUser.node.id).id;

    // Test that node was written to preview storage
    let testUser = await context.db.Test_User.find({ id }, { preview: true });
    expect(testUser.stringRequired).to.equal('German');

    // Non-preview storage is empty
    testUser = await context.db.Test_User.find({ id }, { preview: false });
    expect(testUser).to.equal(null);
  });

  it('enforces unique constraints for scalar fields', async () => {
    const resultDE = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          stringUnique: 'Unique',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const resultEN = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English',
          stringUnique: 'Unique',
          locale: 'en',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    // Enforces unique key
    try {
      const resultDE2 = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'German',
            stringUnique: 'Unique',
            locale: 'de-DE',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      throw new Error('Does not enforce unique constraint');
    } catch (e) {
      expect(e.message).to.include('handler.postgres.errors.unique');
    }

    // Can update unique value
    const resultDEUpdated = await executeQuery(
      UPDATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          stringUnique: 'Unique',
          id: resultDE.createUser.node.id,
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(resultDEUpdated.updateUser.node.stringUnique).to.equal('Unique');

    // Create non-unique value and change to unique
    const otherUserDE = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          stringUnique: 'Unique2',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(otherUserDE.createUser.node.stringUnique).to.equal('Unique2');

    // Now change to unique value via update
    try {
      await executeQuery(
        UPDATE_USER_MUTATION,
        context,
        {
          input: {
            id: otherUserDE.createUser.node.id,
            stringUnique: 'Unique',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      throw new Error('Does not throw');
    } catch (e) {
      expect(e.message).to.include('handler.postgres.errors.unique');
    }
  });

  it('enforces unique constraints for relation fields', async () => {
    const resultDE = await executeQuery(
      `mutation M($input: Test_createRelatedInput!){
      createRelated: Test_createRelated(input: $input) {node {id}}
    }`,
      context,
      {
        input: {
          name: 'Related',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const child1 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          relatedUnique: resultDE.createRelated.node.id,
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child1.createUser.node.stringRequired).to.equal('German');

    // Can create child with same ID but different locale
    const child2 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English',
          relatedUnique: resultDE.createRelated.node.id,
          locale: 'en',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child2.createUser.node.stringRequired).to.equal('English');

    try {
      // Fails for unique violation
      const child3 = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'English',
            relatedUnique: resultDE.createRelated.node.id,
            locale: 'en',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.include('handler.postgres.errors.unique');
    }
  });

  it('enforces unique constraints for enum fields', async () => {
    const child1 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          enumUnique: 'VALUE1',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child1.createUser.node.stringRequired).to.equal('German');

    // Can create child with same ID but different locale
    const child2 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English',
          enumUnique: 'VALUE1',
          locale: 'en',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child2.createUser.node.stringRequired).to.equal('English');

    try {
      // Fails for unique violation
      const child3 = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'English',
            enumUnique: 'VALUE1',
            locale: 'en',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.include('handler.postgres.errors.unique');
    }
  });

  it('enforces unique constraints for content fields', async () => {
    const related = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const child1 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          parentUnique: related.createUser.node.contentNode.id,
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child1.createUser.node.stringRequired).to.equal('German');

    // Can create child with same ID but different locale
    const child2 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'English',
          parentUnique: related.createUser.node.contentNode.id,
          locale: 'en',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    expect(child2.createUser.node.stringRequired).to.equal('English');

    try {
      // Fails for unique violation
      const child3 = await executeQuery(
        CREATE_USER_MUTATION,
        context,
        {
          input: {
            stringRequired: 'English',
            parentUnique: related.createUser.node.contentNode.id,
            locale: 'en',
          },
        },
        {
          authContext: staffUser.auth,
        }
      );
      throw new Error('Does not fail');
    } catch (e) {
      expect(e.message).to.include('handler.postgres.errors.unique');
    }
  });

  it('writes ContentNode list items', async () => {
    const related = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German Original',
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );

    const child1 = await executeQuery(
      CREATE_USER_MUTATION,
      context,
      {
        input: {
          stringRequired: 'German',
          childrenList: [related.createUser.node.contentNode.id],
          locale: 'de-DE',
        },
      },
      {
        authContext: staffUser.auth,
      }
    );
    const { node } = child1.createUser;
    expect(node.stringRequired).to.equal('German');
    expect(node.childrenList.length).to.equal(1);
    expect(node.childrenList[0].stringRequired).to.equal('German Original');
  });
});

async function getModules(name: string): Promise<Array<ModuleConfig>> {
  return await buildModules(path.join(__dirname, 'testprojects', name));
}

async function createContentBaseTypes(context: Context) {
  // Create locale
  // await context.db.Locale.create({
  //   name: 'English',
  //   code: 'en',
  //   isActive: true,
  //   isDefault: true,
  // });
  await context.db.Locale.create({
    name: 'German',
    code: 'de-DE',
    isActive: true,
    isDefault: false,
  });
  await context.db.Locale.create({
    name: 'Italian',
    code: 'it-IT',
    isActive: false,
    isDefault: false,
  });

  await context.db.ContentStatus.create({
    name: 'REVIEW',
    label: 'Review',
  });
  //
  // await context.db.ContentStatus.create({
  //   name: 'PUBLISHED',
  //   label: 'Published',
  // });
  //
  // await context.db.ContentStatus.create({
  //   name: 'DRAFT',
  //   label: 'Draft',
  // });
}
