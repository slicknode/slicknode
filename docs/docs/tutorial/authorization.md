title: GraphQL Tutorial: Authorization
description: How to add authorization to your GraphQL API using Slicknode. Declaratively define authorization rules to secure your GraphQL API with the authorization module.

# Authorization

With the data model in place, we can now add fine grained access controls for our types.

In Slicknode, all access is defined on a per type basis. For each type, we can create individual
permissions with complex rules that are then automatically applied by Slicknode in the entire
GraphQL API.

For in-depth information about the authorization capabilities of Slicknode, check out
[the authorization documentation](../auth/authorization).

## Instructions

Let's start by restricting the access to our `Blog_Article` nodes. When we deployed the
types to the Slicknode Cloud, Slicknode automatically generated the default permissions for the
type and stored the permission document in the modules folder.

For our `Blog_Article` type, the permissions document should look something like this.

**modules/blog/permissions/Blog_Article.graphql:**

```graphql
query Blog_ArticlePermission1 {
  scope(role: ANONYMOUS, operations: [READ])
}

query Blog_ArticlePermission2 {
  scope(role: STAFF, operations: [CREATE, UPDATE, DELETE, PUBLISH, UNPUBLISH])
}

query Blog_ArticlePermission3 {
  scope(
    role: RUNTIME
    operations: [CREATE, UPDATE, DELETE, READ, PUBLISH, UNPUBLISH]
  )
}
```

This allows any user (role=`ANONYMOUS`) to read articles, but only users with the role `STAFF` can create, update and delete them.

_Let's ignore the rule for the `RUNTIME` role for now._

We can now change the default permissions to implement the business logic we laid out
in the [project description](./description.md).

### Permission Editor

Slicknode has a permission editor built into the console, that lets you easily create permission rules
using autocomplete and an explorer. We recommend to create the rules in the editor and then
copy / replace them in your local permission document.

**Open the permission editor:**

1.  Open the Slicknode console `slicknode console`
1.  Go to the **Settings** tab of the project
1.  Select **Permissions** in the left menu
1.  Select the type that you want to create the permission rule for in the dropdown menu, in our case `Blog_Article`

### Anonymous Access

First we want to ensure that anonymous users can only see articles that are published.
We need to replace the rule for the `ANONYMOUS` role and make it more restrictive.
By default, all the articles can be read by everyone.

In addition to the scope field in the permission query, you can limit the nodes that
are accessible by adding a permission filter, for example:

```graphql
query Blog_ArticlePermission1 {
  scope(role: ANONYMOUS, operations: [READ])
  node(filter: { status: { eq: PUBLISHED } })
}
```

With this rule, all anonymous users can only read `Blog_Articles` that have a `status` of `PUBLISHED`.

Replace the permission rule for the `ANONYMOUS` role in the document for the `Blog_Article`
type (modules/blog/permissions/Blog_Article.graphql) and deploy the changes, fixing any potential errors:

    slicknode deploy

To test the rule, open the GraphQL endpoint URL (`slicknode endpoint`) in a new browser tab.
This should open the GraphiQL explorer without any authentication tokens. If you run the following
query, you should only see published articles:

```graphql
{
  Blog_listArticle {
    edges {
      node {
        id
        title
        status
      }
    }
  }
}
```

If you open the data browser and try to load the articles, you will see that all articles disappeared
that have not the `PUBLISHED` status: The permission rules are also enforced in the admin interface.
We will fix that in the next step.

### Staff Access

We want to ensure that staff members only write articles with themselves as
the author (they can't select another user). We also want to ensure that they only write in
categories that they are assigned to.

To implement this logic, we need to have access to the current user. Slicknode provides the
current user ID as a query variable, which can then be used in the permission filter.
Change the query for the `STAFF` role to the following:

```graphql
query Blog_ArticlePermission2(
  # This query variable is automatically provided by Slicknode
  $user_id: ID!
) {
  # The scope that this rule will be applied to
  scope(role: STAFF, operations: [CREATE, UPDATE, DELETE])

  # Limit the accessible nodes
  node(
    filter: {
      category: { authors: { node: { id: { eq: $user_id } } } }
      author: { id: { eq: $user_id } }
    }
  )
}

# We also want the STAFF users to be able to read all articles, including drafts
# So we add another permission query for this
query Blog_ArticlePermission3 {
  scope(role: STAFF, operations: [READ])
  # No node filter needed here, bcs. rule should apply to all articles
}
```

Save the permission document with the updated rule and deploy the changes to the Slicknode Cloud:

    slicknode deploy

Test the permission rule with the data browser in the console. For example, try to publish an article
in a category where you are not the author. Try to select a user other than yourself as
the author, etc.

## Other Permissions

The permissions for the other types are pretty straightforward. For the types `Blog_Category`,
`Blog_CategoryAuthor`, we want to grant the `READ` operation to anonymous users.

To only allow admin users to make changes to those types, we can use the `ADMIN` role.
(Every `User` that has the `isAdmin` field set to `true` assumes the `ADMIN` role).

Make the following changes to the corresponding permission documents.

**modules/blog/permissions/Blog_Category.graphql:**

```graphql
query Blog_CategoryPermission1 {
  scope(role: ANONYMOUS, operations: [READ])
}

query Blog_CategoryPermission2 {
  scope(role: ADMIN, operations: [READ, CREATE, UPDATE, DELETE])
}
```

**modules/blog/permissions/Blog_CategoryAuthor.graphql:**

```graphql
query Blog_CategoryAuthorPermission1 {
  scope(role: ANONYMOUS, operations: [READ])
}

query Blog_CategoryAuthorPermission2 {
  scope(role: ADMIN, operations: [READ, CREATE, UPDATE, DELETE])
}
```

Save the files and deploy the changes to the Slicknode Cloud:

    slicknode deploy

You can now create a few users (non-admin, staff etc.) and test the permissions in the data
browser.
