title: Union Types: Creating Polymorphic Data Structures with GraphQL using Slicknode
description: How to build flexible data models with GraphQL Union Types in Slicknode. 

# Union Types

Union types allow you to define a type that can be one of the defined types. 
This allows you to create completely flexible and dynamic data structures that can be controlled by
content editors via the Slicknode console. 

## Definition

**Example:**

```graphql
union Content_Section = Content_HeroUnit | Content_Gallery | Content_Teaser
```

This creates a `Content_Section` type that can be either a `Content_HeroUnit`, `Content_Gallery` or a `Content_Teaser`.

## Usage

Union types can be used in fields like all regular types:

```graphql
type Content_Page implements Node & Content {
  id: ID!
  title: String

  # Add as single field
  topContent: Content_Section

  # Union types can also be used as array
  sections: [Content_Section!]!

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
