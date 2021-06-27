# Query API

The Slicknode GraphQL Server provides an extensive API to query the data in your data
stores. You can query a list of nodes as well as single objects, filter and sort the result
sets and paginate through large amounts of data.

## Get Single Node

Every node can be retrieved by its `id` value or by any value of a field that has
the `@unique` directive. Slicknode automatically adds a field to the root Query type.

### Get Node by ID

To retrieve a single `User` node by its ID, you could write the following query:

**Query:**

```graphql
query {
  getUserById(id: "1234xyz") {
    id
    email
  }
}
```

**Result:**

```json
{
  "data": {
    "getUserById": {
      "id": "1234xyz",
      "email": "user@example.com"
    }
  }
}
```

### Get Node by Unique value

When you add the `@unique` directive to a field in your schema, slicknode automatically adds
a field on the root Query type that lets you get a node by its unique field value.

For example, to get a user by its email address, you could use the following query:

**Query:**

```graphql
query {
  getUserByEmail(email: "user@example.com") {
    id
    email
  }
}
```

**Result:**

```json
{
  "data": {
    "getUserByEmail": {
      "id": "1234xyz",
      "email": "user@example.com"
    }
  }
}
```

### Naming convention

For modules that do not have a namespace, the field name on the root query type
follows the naming convention:

`get<TypeName>By<FieldName>`.

For modules with a namespace, the naming convention is as follows:

`<Namespace>_get<TypeNameWithoutNamespacePrefix>By<FieldName>`

## List nodes

When you add a Node type to your schema, Slicknode automatically adds a field to the
root Query type of your GraphQL schema to retrieve a list of nodes, apply filters,
pagination and to sort the results.

For example, to get a list of users, you could use the following query:

```graphql
query {
  listUser {
    edges {
      node {
        id
        email
      }
    }
  }
}
```

**Result:**

```json
{
  "data": {
    "listUser": {
      "edges": [
        {
          "node": {
            "id": "1234xyz",
            "email": "user@example.com"
          }
        },
        {
          "node": {
            "id": "2234xyz",
            "email": "user2@example.com"
          }
        }
      ]
    }
  }
}
```

This returns a list of users with their IDs and email addresses.

## Filtering

Slicknode comes with a variety of filters for the data that is stored in your database.
Whenever you add a node type to your schema, slicknode automatically generates the filter
types for each node and adds them to your schema. This gives you a type safe query API
that is best explored via the GraphiQL Playground.

The filters can be passed as an argument to the list field. For example, to load
only the users that have the domain `slicknode.com` in their email address, you could
execute the following query:

```graphql
query {
  listUser(
    filter: {
      node: {
        email: {
          endsWith: "@slicknode.com"
          # ... mode filter conditions on the email field
        }
        # ... more filter conditions on other fields
      }
    }
  ) {
    edges {
      node {
        id
        email
      }
    }
  }
}
```

You can add as many filter conditions as you like. Multiple filter conditions are
combined with the `AND` operator by default.

If you wanted to load all users that have email addresses for `silcknode.com` **and** have the
first name `John`, you could run the following query:

```graphql
query {
  listUser(
    filter: {
      node: { email: { endsWith: "@slicknode.com" }, firstName: { eq: "John" } }
    }
  ) {
    edges {
      node {
        id
        email
      }
    }
  }
}
```

The generated filter types are derived from the field types of your nodes.

## Pagination

The Slicknode API provides two different methods of pagination. This allows you to load only a slice
of a set of nodes and load more nodes in subsequent requests. You can use a [Relay](https://facebook.github.io/relay/) style
[cursor pagination](#cursor-pagination) or an [offset based pagination](#offset-based-pagination).

The list fields for your nodes on the root GraphQL Query type accept a few arguments
for pagination:

| Name     | Type     | Description                                                                         |
| -------- | -------- | ----------------------------------------------------------------------------------- |
| `first`  | `Int`    | The number of nodes to return when using forward pagination                         |
| `after`  | `String` | The cursor of the last item from the previous slice when using forward pagination.  |
| `last`   | `Int`    | The number of nodes to return when using backwards pagination                       |
| `before` | `String` | The cursor of the last item from the previous slice when using backwards pagination |
| `skip`   | `Int`    | The number of nodes to skip in the result set for offset based pagination           |

### Cursor Pagination

With a cursor based pagination you start either at the beginning or at the end of the
dataset and then load a specified number of nodes. For example, to load the first 10 articles. The response
also provides you with a cursor that you can use to load the next slice.

**When to use?**

- you want to use infinite scrolling
- you have large data sets
- you need stable results and don't want to load duplicates when an item is added between requests

**When not to use?**

- you need to be able to jump into the middle of a data set _(you could achieve a similar result with filters though)_

#### Forward Pagination

To load the first 10 users in your application you could use the following query:

```graphql
query {
  listUser(first: 10) {
    pageInfo {
      hasNextPage
    }
    edges {
      cursor
      node {
        id
        email
      }
    }
  }
}
```

**Result:**

```json
{
  "data": {
    "listUser": {
      "pageInfo": {
        "hasNextPage": false
      },
      "edges": [
        {
          "cursor": "1",
          "node": {
            "id": "VXNlcjox",
            "email": "john.doe@example.com"
          }
        },
        {
          "cursor": "2",
          "node": {
            "id": "VXNlcjoy",
            "email": "max.mustermann@example.com"
          }
        }
      ]
    }
  }
}
```

Besides the actual data of the node (`id`, `email`) we are also loading some pagination information.
`hasNextPage` indicates whether there is more data stored in the database than was returned
in the current slice, and the cursor of the edge can be used to load more nodes or to
refresh the loaded data.

To load the next slice of data, we use the cursor of the last item from the previous response
and pass it as an argument to the field:

**Query:**

```graphql
query {
  listUser(first: 10, after: "cursorfromlastitemofpreviousresponse") {
    pageInfo {
      hasNextPage
    }
    edges {
      cursor
      node {
        id
        email
      }
    }
  }
}
```

This returns the next slice of data and can be repeated until all the data is loaded.

#### Backward Pagination

You can also start the pagination from the end of your data set. It is very similar to the
forward pagination, but instead of the arguments `first` and `after`, we are using the
equivalent arguments `last` and `before`.

To load the last 10 users in your database, use the following query:

```graphql
query {
  listUser(last: 10) {
    pageInfo {
      hasPreviousPage
    }
    edges {
      cursor
      node {
        id
        email
      }
    }
  }
}
```

To load the next slice of data, use the first cursor of the returned response and pass it as
an argument to the list field:

**Query:**

```graphql
query {
  listUser(last: 10, before: "firstcursorofpreviousresponse") {
    pageInfo {
      hasPreviousPage
    }
    edges {
      cursor
      node {
        id
        email
      }
    }
  }
}
```

### Offset Based Pagination

With offset based pagination, you can request a number of nodes from a set of data
and optionally skip any number of nodes. This allows you to directly jump into the middle of a dataset.

**When to use?**

- You need to jump into a middle of a dataset
- You need to implement page based pagination

**When not to use?**

- You have changing result sets and need stable results _(someone adds or removes nodes between requests)_
- You need to jump far into a dataset and need top performance _(use cursor based pagination with filters instead)_

To load 10 nodes, provide the number of nodes to load in the `first` argument and use the `skip` argument
to indicate how many nodes should be skipped from the result set.

The following query would load the first 10 nodes:

```graphql
query {
  listUser(first: 10, skip: 0) {
    pageInfo {
      hasNextPage
    }
    edges {
      node {
        id
        email
      }
    }
  }
}
```

The following query would load the nodes 11-20:

```graphql
query {
  listUser(first: 10, skip: 10) {
    pageInfo {
      hasNextPage
    }
    edges {
      node {
        id
        email
      }
    }
  }
}
```

## Total Count

To get the total number of nodes that are stored on the server, you can use the field `totalCount` that is available
on every connection type:

```graphql
{
  listUser {
    totalCount
  }
}
```

This will return the total number of users in the system. There are a few things to keep in mind when querying the
total count:

- **Permissions:** The [permission filters](../auth/authorization) are automatically applied to the aggregation query,
  that means that the server only counts the nodes that are accessible by the current user.
- **Filters:** The filters that are passed to the parent field are also applied to the aggregation query, which lets
  you count only a subset of the nodes.
- **Pagination:** When a cursor is passed to the input arguments `after` or `before`, the aggregation query is
  adjusted to only return the total number of nodes after or before the given cursor. This lets you count
  the number of nodes on each side of the loaded data slice without loading the actual nodes.

  For example for a functionality like _(24 new comments - Click to load)_

If you want to get the `totalCount` of nodes and a slice of nodes in the same request, you can use
aliases:

```graphql
query PaginatedUsers($after: String) {
  listUser {
    # This returns all users without pagination limitation
    totalCount
  }
  # We only add the cursor on this field here to get a slice of nodes
  paginatedUsers: listUser(after: $after, first: 10) {
    edges {
      node {
        id
        # ... other fields
      }
    }
  }
}
```

Note that the input arguments `first` and `last` are ignored to determine the total count. You can derive that
number from the number of returned nodes if needed.

## Sorting

By default, the returned nodes of a list field are returned in the order they were added
to the data store (sorted by `id`).
If you want to change the sorting order of the result, you can pass the argument `order` to the list field.
By default, the results are sorted in ascending order.

### Sorting Fields

To get a list of users sorted by their `lastName`, you could run the following query:

```graphql
query {
  listUser(order: { fields: ["lastName"] }) {
    edges {
      node {
        id
        lastName
      }
    }
  }
}
```

You can also sort the results by multiple fields. For example, if you have multiple
users with the same last name and you want to sort the results by the `lastName` first
and `firstName` second, you can add that field to the sorting configuration:

```graphql
query {
  listUser(order: { fields: ["lastName", "firstName"] }) {
    edges {
      node {
        id
        lastName
      }
    }
  }
}
```

You can add any number of fields to the sorting order. Keep in mind though that this might
consume a significant amount of database resources, depending on the size and complexity
of your data, available indexes etc.

### Sorting Direction

By default, all nodes are sorted in ascending order. If you want to change the default
behavior, you can provide the sorting direction as an argument:

```graphql
query {
  listUser(order: { fields: ["lastName"], direction: DESC }) {
    edges {
      node {
        id
        lastName
      }
    }
  }
}
```

The sorting direction is a system enum type with the values `ASC` for ascending order and
`DESC` for descending order and is part of all Slicknode GraphQL schemas.

## Preview / Published

The Slicknode GraphQL API has two modes to load content for all nodes that implement the `Content` interface.

- **Published Mode (default):** This mode returns all content from the published storage. Unpublished content is not returned from the API.
- **Preview Mode:** In this mode, the API returns all content from the draft storage including unpublished content.

Usually you would use the preview mode to preview changes and unpublished content and use the published node to deliver the content to end users.

By default, the API returns content in the published mode. There are several ways to enable the published mode of the API.

### HTTP-Header

You can enable the preview mode by adding the HTTP header `X-Slicknode-Preview: 1` to requests to the GraphQL API:

```javascript
const endpoint = 'https://<your-slicknode-endpoint>';
fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Slicknode-Preview': '1',
  },
  body: JSON.stringify({
    query: '{ Blog_getPostBySlug(slug: "my-article") {title} }',
  }),
})
  .then((r) => r.json())
  .then((data) => console.log('data returned:', data));
```

### Input Arguments

You can enable the preview and published mode for individual parts of your GraphQL query by using the `preview` input argument. The selected mode will then be used to return the data of that node and the entire selection set of all its children.

**For example:**

```graphql
query GetPost($slug: String!) {
  # This will return the blog post in preview mode
  unpublishedPost: Blog_getPostBySlug(slug: $slug, preview: true) {
    title
    # ...

    # The category will be loaded from preview storage,
    # since `preview` was set to true in a parent field
    category {
      name
      # This will also be returned in preview node, preview settings cascades
      articles {
        edges {
          node {
            title
          }
        }
      }
    }
  }

  # Returns the published version of the post
  publishedPost: Blog_getPostBySlug(slug: $slug, preview: false) {
    title
    # You can also override the preview mode in a child selection set.
    # `category` will now be loaded in preview mode
    category(preview: true) {
      name
      # Articles will now be loaded in preview mode,
      # since the `preview` setting of the closest parent is `true`
      articles {
        edges {
          node {
            title
          }
        }
      }
    }
  }
}
```

Setting the preview mode via HTTP-Header and via input arguments can be used in combination. In that case, the preview setting of the HTTP header is applied to the query and the setting of the input argument overrides the setting for the particular part of the GraphQL query.
