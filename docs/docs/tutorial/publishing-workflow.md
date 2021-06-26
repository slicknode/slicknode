title: GraphQL Tutorial: Implement a publishing workflow
description: Implement a publishing workflow in your GraphQL API

# Publishing Workflow

To implement the publishing workflow for our blog, we will use [Enum types](../data-modeling/enum-types.md)
for the different article states and later add access restriction with the 
[authorization functionality](../auth/authorization) of Slicknode.

## Instructions

Our blog articles can have 3 different states: Draft, Published, and Archived.
Since they don't change, we can use an enum type for this. 

Add the following to the schema file of the blog module.

**modules/blog/schema.graphql:**

```graphql
enum Blog_ArticleStatus {
  # Article is in draft mode, not published
  DRAFT

  # Article is published
  PUBLISHED

  # Article is archived and not published anymore
  ARCHIVED
}

type Blog_Article implements Node & TimeStampedInterface {
  # ... other fields
  status: Blog_ArticleStatus
}
```

Deploy the changes and fix any potential errors:

    slicknode deploy

Now go to the console (`slicknode console`) and assign a status to each article in your database. 

You can now query the status of each article via the GraphQL API. Open the playground 
(`slicknode playground`) and test your new field:

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

