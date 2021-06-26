title: GraphQL Tutorial: Adding many-to-many relations to GraphQL API
description: Add many-to-many relations to your Slicknode GraphQL API using the relation directive

# Many-to-many Relations

So far we have only created One-to-many relationships between the `Blog_Category`, the 
`Blog_Article` and the `User` types. To implement the feature that we can assign individual
users to different categories, we need a Many-to-many relationship. 

## Instructions

To add a Many-to-many relationship in Slicknode, we can use the same `@relation` directive
that we used for the One-to-many relationship. We only need to add one additional hop. When each category
can have multiple users and vice versa, we need an intermediate type that stores the information
about which user is assigned to which category. 

We will name this type `Blog_CategoryAuthor` and add it to the blog schema:

**modules/blog/schema.graphql:**

```graphql
type Blog_CategoryAuthor implements Node {
  id: ID!
  category: Blog_Category!
  user: User!
}
```

We also want to have the relationship fields on both the `Blog_Category` and the `User` type. 
This works the same as for the previous relations, we only add the additional hop via the `Blog_CategoryUser` in the 
path argument of the `@relation` directive:

```graphql
type Blog_Category implements Node {
  # ...
  authors: [User!]! @relation(path: "Blog_Category=category.Blog_CategoryAuthor.user=User")
}

extend type User {
  # ...
  Blog_categories: [Blog_Category!]! @relation(path: "User=user.Blog_CategoryAuthor.category=Blog_Category")
}
```

Now deploy the changes and fix any potential errors:

    slicknode deploy

To test your relationship, go to the Slicknode console `slicknode console` and create a few 
`Blog_CategoryAuthor` objects via the data browser. 

Then run a few test queries in the playground (`slicknode playground`), for example load all categories of the currently logged in user:

```graphql
{
  viewer {
    user {
      Blog_categories {
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
```
