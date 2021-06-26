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
    $email: String!,
    $firstName: String!,
    $lastName: String!,
    $username: String!
) {
    createUser(input: {
        email: $email,
        firstName: $firstName,
        lastName: $lastName,
        username: $username
    }) {
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
mutation UpdateUserMutation(
    $id: ID!
    $email: String!
) {
    updateUser(input: {
        id: $id,
        email: $email
    }) {
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
mutation DeleteUserMutation(
    $id: ID!
) {
    deleteUser(input: {id: $id}) {
        node {
            id
        }
    }
}
```