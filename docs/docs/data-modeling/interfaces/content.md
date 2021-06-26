# Content Interface

The `Content` interface is an interface that enables comprehensive content management functionality
for a type with version history, localization and content workflows. 

## Installation

The `Content` interface is part of the `content` module. To install the content 
functionality, add the module and deploy the changes to the Slicknode cloud:

```bash
slicknode module add content
slicknode deploy
```

This makes the `Content` interface available in your project.

## Definition

The `Content` interface has the following definition:

```graphql
"""Interface for content management enabled types"""
interface Content {
  """The main content node that groups the nodes with individual translations"""
  contentNode: ContentNode!

  """The locale of the content node"""
  locale: Locale!

  """The current status of the node"""
  status: ContentStatus!

  """The time when the node was last published"""
  publishedAt: DateTime

  """The user that published the node"""
  publishedBy: User

  """The time when the object was first added"""
  createdAt: DateTime!

  """The user that created the node"""
  createdBy: User

  """The time when the object was last updated"""
  lastUpdatedAt: DateTime

  """The user that last updated the node"""
  lastUpdatedBy: User
}
```

## Usage

To add content management functionality to a type, the type needs to implement the
`Content` interface as well as the `Node` interface (to enable database storage).

**Example implementation:**

```graphql
type Blog_Post implements Node & Content {
  id: ID!
  
  # Add your custom fields here:
  title: String!
  text: String @input(type: MARKDOWN)
  # etc...

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

!!! info "Note"

    The `Content` interface has to be implemented **when the type is first created**. 
    It is currently not possible to add or remove the `Content` interface on types 
    that already exist in your project and are deployed to the cloud. You would have 
    to delete and then recreate the type, which would delete all data, or choose a 
    different name.

## Publishing Workflow

When a type implements the `Content` interface, Slicknode creates two independent stages
under the hood:

1.  **Preview:** When a node is first created, it is added to the preview stage. This is your working
    version where you can test changes, experiment with content and assign different `ContentStatus` to 
    the content object. For example, from DRAFT to QA and LEGAL_REVIEW.
    When you are done with your changes, you can then publish your
    changes to the published stage. This is the stage that is used in the Slicknode console.
1.  **Published:** The published stage is the default stage for queries in the GraphQL API. You would
    usually use this as the stage with your client applications. Content will only be visible
    in this stage once it is published. 

After you have published a content node, you can still make changes to the preview stage
without affecting the live/published stage. 

For more information on how to use the different stages, check out the query API documentation.

## Localization

To localize content, you can create a copy of the content for every locale that is configured in 
your project. This allows you do independently manage the content for each locale. 

For every localization, a new Node is created with its own ID. The individual localized
nodes of a content item are then grouped by the `ContentNode` that is saved in node.

When you create a new content item for a type, a new `ContentNode` is automatically created
and attached to the node. The `ContentNode` with its ID can then be used to create a translation
of that node.

**Example:**

First we create a Blog post with the default locale:

```graphql
mutation {
  Blog_createPost(input: {
    title: "GraphQL is Awesome",
    text: "Slicknode makes GraphQL easy"
    slug: "graphql-is-awesome"
    
    # If this is omitted, a post with the default locale will be created
    locale: "en"
  }) {
    node {
      id
      title
      text
      # The content node is automatically created and attached:
      contentNode {
        # This is the ID we need to create a localization
        id
      } 
    } 
  }
}
```

Now we can create a localization for the post. *(The locale needs to exist in your project.)*

```graphql
mutation {
  Blog_createPost(input: {
    title: "GraphQL ist fantastisch",
    text: "Mit Slicknode wird GraphQL einfach"
    locale: "de"
    slug: "graphql-is-awesome"
    contentNode: "<content-node-id-of-previously-created-node>"
  }) {
    node {
      id
      title
      text
    } 
  }
}
```

The localized nodes are independent of each other and can both be published, unpublished,
deleted etc. without affecting the other localizations. 

They can also move through the publishing workflow with separate statuses. For example,
the english version can already be published while the German version is still under review
and not public yet.


## Querying

Fields that return content nodes in your GraphQL API have two additional input arguments, `preview: Boolean` &
`locale: String` that control which locale and stage is returned by the field. 

**Example:**

```graphql
query {
  # Get the preview version of the blog post with German translation:
  germanPost: Blog_getPostBySlug(
    slug: "graphql-is-awesome",
    preview: true,
    locale: "de"
  ) {
    title
    text
  }
  
  # Locale omitted returns the default locale version:
  defaultLocalePostPreview: Blog_getPostBySlug(
    slug: "graphql-is-awesome",
    preview: true
  ) {
    title
    text
  }
  
  # Preview: false returns the published version
  defaultLocalePostPublished: Blog_getPostBySlug(
    slug: "graphql-is-awesome",
    preview: false
  ) {
    title
    text
  }

  # Returns published version with default locale
  postPublishedDefaultLocale: Blog_getPostBySlug(
    slug: "graphql-is-awesome"
  ) {
    title
    text
  }
}
```
