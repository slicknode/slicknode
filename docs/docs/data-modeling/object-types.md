title: Object Types: Using object types in GraphQL
description: How to create object types for Slicknode using the GraphQL Schema Definition Language (GraphQL SDL)

# Object Types

Object types are used in GraphQL to define the custom data structures of your application as well as
the relationships between objects. This is the equivalent of modeling your database schema and models
in traditional applications. With Slicknode, you only have to define the Schema for the API using the
GraphQL SDL and Slicknode takes care of creating the database tables, running migrations, creating and 
enforcing foreign key constraints, unique constraints, creating indexes etc.
 
Based on the Schema that you define, the API with CRUD operations and the CMS is automatically generated.

There are three different object types available in Slicknode: 

- **Persisted Types:** For simple objects that you want to store in the Slicknode database and where
  you don't need internationalization, a version history, or a content workflow. 
  You can load and manipulate persisted types via GraphQL queries and mutations.

- **Content Types:** Content types extend the functionality of the simple persisted types and add
  support for internationalization, content workflows, version history, etc.

- **Non-Persisted Objects:** Non-Persisted Objects are object types that just define 
  a data structure without being persisted to the database itself. They can be used to define
  return values for [custom resolvers](../extensions/resolvers.md) and [mutations](../extensions/mutations.md).
  
Note that the types cannot be converted once they are deployed to the cloud. For example,
you cannot create a simple persisted type and later convert it into a content type. 


## Persisted Types

All persisted types have to implement the `Node` interface. The `Node` interface has a field with 
the name `id` that has the type `ID!`. This creates the primary key in the database and makes
it possible to load individual objects of that type. 

For example, a simple article type in a module with the namespace `NewsFeed` and a text field
could look as follows: 

```graphql
# A simple news article in the news feed
type NewsFeed_Article implements Node {
  # We always have to add all fields from the implemented interfaces
  # in this case the `id` field from the Node interface
  id: ID!
  
  # We can add more fields with other data types
  text: String
}
```

For the field types you can use the supported [Scalar types](./scalar-types.md) or any of the
object types in your application that implement the `Node` interface. 

Also see [Relations](./relations.md) if you want to create list values or create relationships
between objects. 


## Content Types

To enable content management functionality with versioning, localization and publishing
workflow, implement both the `Content` interface and the `Node` interface in your type. 

This should be the base structure for most of the content types in your project. For example:

```graphql
type Content_Page implements Node & Content {
  id: ID!

  # Add / change your custom fields here:
  title: String!
  slug: String! @unique
  # ...
  
  # Fields of Content interface:
  contentNode: ContentNode!
  locale: Locale!
  status: ContentStatus!
  publishedAt: DateTime
  publishedBy: User
  createdAt: DateTime!
  createdBy: User
  lastUpdatedAt: DateTime
  lastUpdatedBy: User
}
```

!!! note "Tipp"

    We recommend to create a snippet for the content type in your IDE, so you can quickly create 
    new types. 

For more information about content types, check out the [documentation of the Content interface](./interfaces/content.md).


## Field Configuration

### Required fields

If you want to make a field required, you can append the field type with an exclamation mark. 
In the above example, the field `id` always has a value whereas the `text` field is optional 
*(it can also contain the value `NULL`)*

!!! note "Note"

    The not-null constraint is enforced at the database level for maximum data consistency. You cannot 
    add a required field to a type that already has records in the database. To add a required field
    you first have to add the field as non required and add values to the existing objects via the API.
    Afterwards you can change the field type to be required. 


### Array Fields

Fields with array values can be defined using brackets, for example:

```graphql
type Website_Page implements Node {
  id: ID!
  
  sections: [Website_Section!]!
  # ... other fields
}
```

Slicknode currently supports the following field types for array fields:

-   Content types that implement the `Content` interface.
-   [Union Types](./union-types.md) that consist only of types that implement the `Content` interface.


### Descriptions

You can add descriptions to fields as well as to the type itself. Descriptions are enclosed in 
triple quotes and can span across multiple lines. 

For example:

```graphql
"""
This is the description of the type and will be added to the GraphQL type

It can span across multiple lines an can contain `markdown`
"""
type MyModule_TypeName implements Node {
  """Single line description"""
  id: ID!
  
  """
  This description is added to the field 
  Descriptions can have multiple lines and support markdown
  """
  fieldWithDescription: String
}
```

It is recommended to add good documentation in the form of descriptions to your schema. 
This will be used as the description for the GraphQL types which will be available in the
GraphiQL API explorer as well as in the forms of the CMS. The descriptions also 
appear in IDEs that support GraphQL. 

You can use markdown to link to external resources if you need very long descriptions. 

### Unique fields

You can add unique constraints to your fields. This will ensure that each value is unique
across all objects of that type. To create a unique constraints for a field, add the 
`@unique` directive after the field type.

For example, if we want to create a slug for the article for nice page links: 

```graphql
type NewsFeed_Article implements Node {
  id: ID!
  slug: String! @unique
  text: String
}
```

`NULL` values are ignored for the uniqueness, so there can be multiple objects that have
the value `NULL` in a unique field.

You can also create unique constraints over multiple fields. Check out the documentation
for [indexes and unique constraints](./indexes.md).

!!! note "Note"

    When you add a `@unique` constraint on a field that already has non-unique values stored in the data store,
    the migration will fail as the unique constraints are enforced at the database level. 
    If you only have unique or `NULL` values stored for that field, the `@unique` constaint
    can be added without problems. 
