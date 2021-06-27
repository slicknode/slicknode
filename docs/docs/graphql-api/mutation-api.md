# Mutation API

Slicknode automatically adds CRUD methods to your API for all node types that are part of your
GraphQL schema. The write operations are available as GraphQL mutations in the schema on the root
mutation type.

To perform a mutation, you can send a GraphQL mutation to your API endpoint.

Slicknode currently supports the following operations:

- [Create Node](#create)
- [Update Node](#update)
- [Delete Node](#delete)

!!! note "Note"

    The mutation fields are only added if at least one role has the permission to perform
    the operation. If no user is allowed to perform a specific operation, the corresponding
    field is not added to the schema. Also see [authorization](../auth/authorization) for
    more information about permissions.

## Create

To create a new node and store it in the database, you can execute the `(<Namespace>_)create<NodeName>` mutation.
For example, a query to add a new user could look like this.

**Query:**

```graphql
mutation CreateUserMutation(
  $email: String!
  $firstName: String!
  $lastName: String!
  $username: String!
) {
  createUser(
    input: {
      email: $email
      firstName: $firstName
      lastName: $lastName
      username: $username
    }
  ) {
    node {
      id
      email
    }
  }
}
```

If the mutation is successful, the field returns the created node as the mutation
payload. If the mutation is unsuccessful, for example if a unique constraint fails, the result
of the field is `NULL` and an error with an error message is returned in the GraphQL response.

## Update

To update a node in your database, you can execute the `(<Namespace>_)update<NodeName>` mutation. This performs
a partial update of the node for all the fields that are provided as input. Only the ID field
is required to specify which node should be updated.

A mutation to update the email address of a user could look as follows:

```graphql
mutation UpdateUserMutation($id: ID!, $email: String!) {
  updateUser(input: { id: $id, email: $email }) {
    node {
      id
      email
    }
  }
}
```

## Delete

To delete a node, you can execute the `(<Namespace>_)delete<NodeName>` mutation. This removes the specified
node by its ID.

!!! warning "Important"

    The delete mutation performs a cascading delete. That means that all values of fields that
    reference the deleted node will be set to `NULL`, or, if the field type is required, the
    referencing objects will be deleted as well. Also see [relations](../data-modeling/relations) for more information.

**Query:**

```graphql
mutation DeleteUserMutation($id: ID!) {
  deleteUser(input: { id: $id }) {
    node {
      id
    }
  }
}
```

## Publishing Workflow

To enable the publishing workflow for content nodes, add the `Content` interface to the
node types. For nodes with the `Content` interface, Slicknode adds two additional additional mutations to the GraphQL API to publish and unpublish nodes.

There are two different storage types in the Slicknode API for all content nodes, which are represented by separate database tables under the hood:

- **A draft storage** for creating, editing and reviewing content. When a content node is first created, it is automatically assigned the `DRAFT` status.
- **A published storage** that you usually use to deliver the production live content. Content nodes have the `PUBLISHED` status will be copied from the draft storage to the published storage.

The two storages are independent. You can make changes to content in the draft storage without affecting the same node that already has a copy in the published storage. You can create additional statuses via the console by adding additional `ContentStatus` nodes. Custom content statuses allow you to create custom workflows like **Draft > Review > Q&A > Published**. The statuses will only be applied to nodes in the draft storage. Only the `PUBLISHED` status moves the node to the published storage.

Use the publish and unpublish mutations to manage the status of content nodes.

### Publish

To move nodes to a different status, execute the `(<Namespace>_)publish<NodeName>` mutation. You can change the status of multiple nodes (up to 100) in a single mutation.

```graphql
mutation PublishPost($ids: [ID!]!, $status: String!) {
  Blog_publishPost(input: { ids: $ids, status: $status }) {
    nodes {
      id
      status {
        name
      }
    }
  }
}
```

The above mutation will change the status of the content nodes and return a list of the updated nodes.

The publish mutation has the following rules and behaviors:

- `$status` can be any of the statuses that are available as `ContentStatus` in your Slicknode project.
- The statuses `DRAFT` and `PUBLISHED` are builtin and cannot be changed.
- Newly created nodes are automatically assigned the `DRAFT` status.
- When you change the status to `PUBLISHED`, the node is copied to the published storage and the status is in the preview storage is changed to `PUBLISHED` as well.
- After a content node is copied to the publishing storage, publishing a node to a new status will only be applied to the node in the draft storage. The published node will remain published and won't be affected by updates that are applied to the node. To apply changes to the node in the draft storage to the published storage, publish the node to the `PUBLISHED` status again.

### Unpublish

To remove a content node from the published storage, execute the `(<Namespace>_)publish<NodeName>` mutation for the nodes that you want to unpublish. You can unpublish multiple nodes in a single mutation (up to 100).

```graphql
mutation PublishPost($ids: [ID!]!) {
  Blog_unpublishPost(input: { ids: $ids }) {
    nodes {
      id
      status {
        name
      }
    }
  }
}
```

This will remove the nodes with the provided `$ids` from the published storage and a list of the updated nodes is returned.

- Unpublishing a node does not affect the draft storage. So all changes to the node won't be affected and the unpublished node can be published again via the publish mutation.
- To remove a node from your project entirely, use the delete mutation instead.
