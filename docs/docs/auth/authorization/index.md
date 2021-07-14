# Authorization

To secure and control the access to the data in your application is a crucial functionality for
any modern application. With a GraphQL server, clients have the possibility to query any data that
exists inside of your application. This adds another level of complexity. With REST APIs you can
limit the access on certain resources, but the flexibility of GraphQL needs or more sophisticated
approach.

Slicknode provides a powerful set of tools that lets you implement very complex permission scenarios
with a few lines of code. Instead of implementing permission logic using a programming language,
you can declaratively define your access scenarios by using GraphQL and let Slicknode automatically
apply the permission logic to the operations that are performed on your graph.

The permission system is deeply integrated into the Slicknode query engine and automatically
filters objects that cannot be accessed by the current user. You define the permissions for each
node once and they are automatically applied across your whole GraphQL API, in relations, mutations,
deeply nested fields etc.

## Fundamentals

The permissions in slicknode are defined using GraphQL queries. When you create a module with a
type and deploy it to the servers, slicknode automatically creates a `permissions` folder inside
your module with the default permissions. The folder structure might look something like this:

    modules/
        blog/
            permissions/
                Blog_Article.graphql
            schema.graphl
            slicknode.yml

Inside of the permissions folder you can define permission queries in a GraphQL document for each
type. Each type gets its own file, which has to be named `<TypeName>.graphql` and has to be placed
inside of the permissions folder of the module.

Inside of the document you can add multiple queries. The permission queries work as a white list.
If there are no permission queries in the document, no operations are permitted on the node.
You can grant access to the nodes and operations by adding queries to the permission document.
This enables you to create fine grained multi layered permission scenarios like:

- Anonymous users can view articles that are published
- The author of an article can edit her own articles
- The admin of a specific category can delete articles that were posted in that category
- etc.

Each of those scenarios would get one query in the permissions document. Slicknode automatically
figures out how to apply the permissions in the most efficient way in all parts of the graph.

## Permission Queries

Slicknode uses an internal permission schema for each type to determine if a user is permitted
to perform a requested operation. You define the permissions by writing standard GraphQL queries
for that permission schema.

!!! info "Tip"

    There is a permission query editor available in the console under the settings tab of your project.
    This allows you to use autocomplete and syntax check while you write the permission queries
    for your types. Just open the console, select the project and then go to Settings > Permissions.

The permission schema only has boolean fields on the query root type. When **all** fields of a
permission query return `true`, the access is granted for the user. Otherwise, the rule that failed
is ignored and other rules can grant access. If there is no rule that grants access to perform the
requested operation, the access is denied.

For example, a permission query document for an article of a blog module could look as follows.

**File:** `modules/blog/permissions/Blog_Article.graphql`

```graphql
query Blog_ArticlePermission1 {
  scope(role: ANONYMOUS, operations: [READ])
}

query Blog_ArticlePermission2 {
  scope(role: STAFF, operations: [CREATE, UPDATE, DELETE, PUBLISH, UNPUBLISH])
}
```

This allows anonymous users to read all articles. Staff users can also perform the
CRUD and publishing operations on article nodes.

!!! info "Info"

    This is also the default permission set when you create a new type in your project without providing
    any permissions: Anonymous users can only read all items and staff users can permorm all CRUD
    operations. To change the default permissions, adjust, add or remove the permission queries to
    meet your needs.

### Scope

Every permission query must define for which scope it will be applied. This is done by adding the `scope`
field to the permission query. It takes two **required** arguments: `role` and `operations`

#### Role

When a client accesses your GraphQL API, Slicknode assigns a set of roles to the user depending
on the authentication information that is provided to the API. By default, every user gets the
`ANONYMOUS` role. If you provide a valid authentication token with the request, the user might
get additional roles.

There are several roles available:

| Role            | Description                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ANONYMOUS`     | This role is assigned to every user that accesses your API. Only use this if you want to grant access to everyone.                                                                                           |
| `AUTHENTICATED` | A user that is authenticated and has a valid user account                                                                                                                                                    |
| `STAFF`         | A staff user that has also access to the CMS administration interface. A user is assigned the `STAFF` role when its field `isStaff` has the value `true` for the `User` node                                 |
| `ADMIN`         | An admin user that has full access to the project including administrative tasks, schema changes etc. A user is assigned the `ADMIN` role when its field `isAdmin` has the value `true` for the `User` node. |
| `RUNTIME`       | Requests that are made from [handlers](../../extensions/handlers.md) of your [extensions](../../extensions) using the `accessToken` that is passed in the context                                            |

Using roles to model your access permissions is very fast as there are no database queries required.
Whenever you can, you should use roles to model you permissions and keep the scope as limited as
possible.

#### Operations

The `operations` argument takes a list of values as input for which the access should be granted.

The following operations are available:

| Operation   | Description                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| `CREATE`    | The create mutation of the node that is generated by Slicknode                             |
| `READ`      | Read access to the node via any field of the graph                                         |
| `UPDATE`    | The update mutation of the node that is generated by Slicknode                             |
| `DELETE`    | The delete mutation of the node that is generated by Slicknode                             |
| `PUBLISH`   | The publish mutation of the node that is generated by Slicknode _(only `Content` nodes)_   |
| `UNPUBLISH` | The unpublish mutation of the node that is generated by Slicknode _(only `Content` nodes)_ |

### Node filters

For more advanced use cases, role based permissions might not be specific enough. A permission
that depends on the data that it is being applied to can be defined in Slicknode by using node filters.
A standard use case could be that an author of a blog article should be able to edit its own
articles, but not the articles of others.

Node filters filter the nodes in the dataset for every operation based on the user that is
accessing the API. In combination with roles, you can implement very complex permission scenarios
with a simple GraphQL permission query. The filter is automatically applied to all nodes
regardless of where in the graph the data is requested. This keeps the permission logic in
a central location and adds additional security, as there is no need to keep track of all the
edge cases in your application where a certain object might be exposed.

Let's take the example of a blog module where the author of a blog post needs to be able to update
her own articles.

**Schema** (`schema.graphql`):

```graphql
type Blog_Article implements Node {
  id: ID!
  text: String!
  author: User!
}
```

**Permission Query** (`permissions/Blog_Article.graphql`):

```graphql
query Blog_ArticlePermission1($user_id: ID!) {
  scope(role: AUTHENTICATED, operations: [UPDATE])
  node(
    filter: {
      # Use any filter that is available in the GraphQL API
      author: { id: { eq: $user_id } }
    }
  )
}
```

The ID of the current user is passed as the query variable `$user_id` to the query. This `$user_id`
can then be used anywhere in the query to create filters that define on which nodes the operation
is allowed. The `node` field on the permission schema takes one argument `filter` which is the same
filter that is used in connections of the node. You can add filters with multiple conditions or even
create filters through relations that span multiple tables.

### Under the hood

Slicknode performs the evaluation of the access permissions in the following order:

1.  All the permission queries that have a matching scope are collected. If there are no permission
    queries with a matching scope, the access is denied before any operation is executed.
1.  If there is at least one remaining permission query **without** a node filter, the operation is executed without
    any further node filtering.
1.  If there are node filters on the matching permission queries, the operation is executed on all the nodes
    on which any of the node filters matches.
