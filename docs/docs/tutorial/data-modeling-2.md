title: GraphQL Tutorial: Modeling Data Relations
description: Modeling relations in your GraphQL data model with Slicknode. Creating One-to-many relations and how to use Type-Extensions in GraphQL. 

# Data Modeling II - Relations

We already created a One-to-many relationship between the `Blog_Article` and the category. 
This allows us to load the category along with the article, for example:

```graphql
{
  Blog_listArticle {
    edges {
      node {
        title
        category {
          # Select categorie fields here:
          name
        }
      }
    }
  }
}
```

But to build a category page, we need the relation in the other direction: We need to be able to
load the category with all its articles.

## Instructions

To create relations between types, Slicknode provides the `@relation` directive. 

### One-to-many relation

Let's add an articles field to our `Blog_Category` that returns all articles of that particular category:

**modules/blog/schema.graphql:**

```graphql
type Blog_Category implements Node {
  # ... the other fields
  articles: [Blog_Article!]! @relation(path: "Blog_Category=category.Blog_Article")
}
```

Deploy the changes and fix any potential error messages:

    slicknode deploy

Now you can query the categories with all its articles. Open the Slicknode playground (`slicknode playground`)
and test the relation with a GraphQL query, for example:

```graphql
{
  Blog_listCategory {
    edges {
      node {
        id
        name
        articles {
          edges {
            node {
              id
              title
              text
              createdAt
            }
          }
        }   
      }
    }
  }
}
```

### Type Extensions

To create our author page, we need to do the same for the `User` type. The `User` type is part of a builtin Slicknode
module, therefore we cannot add the field directly to the schema file where the `User` type is defined.

Slicknode allows you to extend types that are part of other modules. That way we can just add blog related fields
for the `User` type in the same schema file where we define the other blog types. We just need to extend the type
with the `extend` keyword. Note that we have to prepend the namespace of the module to the field name (`Blog_`) to avoid
name collisions. 

Add the following to the schema file of the blog module.

**modules/blog/schema.graphql:**

```graphql
extend type User {
  Blog_articles: [Blog_Article!]! @relation(path: "User=author.Blog_Article")
}
```

Deploy the changes again and fix any error messages: 
    
    slicknode deploy

Now test the relationship in the playground `slicknode playground`, for example to load all articles
of the currently logged in user:

```graphql
{
  viewer {
    user {
      email
      firstName
      lastName
      Blog_articles {
        edges {
          node {
            id
            title
            text
          }   
        }
      } 
    }
  }
}
```

## Explanations

The Slicknode `@relation` directive is a flexible directive that allows you to add relationship fields
to types in your schema in a flexible way. Slicknode uses the type information to automatically
add all the data fetching logic, filter types, sorting, pagination, etc.

Any field that is added with a `@relation` directive does not change the underlying data that is stored or the 
database tables, it just provides Slicknode with the information it needs to generate the field resolvers. 

To learn in depth how the `@relation` directive works, check out the [relations documentation](../data-modeling/relations.md)


