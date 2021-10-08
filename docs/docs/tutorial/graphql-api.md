title: GraphQL Tutorial: Using the GraphQL API
description: Using the GraphQL API of the Slicknode project

# GraphQL API

Once the schema from the previous step is deployed to the Slicknode cloud, you can start using
your GraphQL API.

## Instructions

Open the Slicknode console by running the following command in your project root directory:

    slicknode console

Open the data section in the menu and add a few categories and articles with some test content.

### Open Playground

Now let's query the content via the GraphQL API. If you are already in the console, you can
open the playground in the main project menu. Alternatively, you can open the playground
with the following command from your project directory:

    slicknode playground

Type a few queries in the editor on the left side and execute the queries.

**Tipp:** Type `Ctrl + Space` to show autocomplete options in the editor.

Some example queries:

**Show currently logged in user:**

```graphql
{
  viewer {
    user {
      firstName
      lastName
      email
    }
  }
}
```

**List first 10 categories:**

```graphql
{
  Blog_listCategory(first: 10) {
    edges {
      node {
        name
        slug
      }
    }
  }
}
```
