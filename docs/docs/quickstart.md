title: Quickstart: Getting Started with Slicknode (5 min)
description: Setup a Serverless GraphQL API with Slicknode in 5 minutes. Production-Ready, Scalable, Extensible...

# Quickstart

This is a quickstart tutorial to create a Slicknode project from scratch. If you would rather start with
a fullstack application, check out our [NextJS blog starter](https://github.com/slicknode/starter-nextjs-blog)

If you prefer a video, check out this 10-minute tutorial which walks you through
everything you need to get started:

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/VGpm6J-0dKg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

## Installation

The Slicknode CLI can be installed via the terminal using npm. ([How to get npm?](https://docs.npmjs.com/getting-started/installing-node))

    npm install -g slicknode@latest

## Usage

### Initialize

To create a new Slicknode project, navigate to the folder where you want to create
your new project and run:

    slicknode init quickstart-project

    # Change into the newly created project directory
    cd ./quickstart-project

!!! info "Info"

    This will ask for your Slicknode login information when run for the first time. Enter the login
    information that you used when you [signed up](https://slicknode.com).

### Adding Modules

[Modules](./data-modeling/modules.md) are the top level building blocks that let you organize your project in a modular way.
They allow you to reuse functionality across multiple projects or to share them publicly with the community.

Now, add some builtin modules for content management and image handling to your project:

    slicknode module add image content

Then deploy the changes:

    slicknode deploy

### Creating New Modules

Your own types will be added in your own modules.
To create a blog for example, run:

    slicknode module create blog

It will suggest a [namespace](data-modeling/modules.md#namespace) and the label that will be displayed in the data browser.
Just hit enter to use the suggested values for now.

This will create the following file structure in your project folder:

    modules/
        blog/
            slicknode.yml
            schema.graphql
    slicknode.yml

### Model your schema

You can model your schema using the GraphQL SDL.

In your favorite editor, open the file
`modules/blog/schema.graphql` and enter your schema, for example:

```graphql
"""
A blog article
"""
type Blog_Article implements Content & Node {
  id: ID!

  title: String!
  image: Image
  slug: String! @unique
  text: String @input(type: MARKDOWN)
  category: Blog_Category
  createdAt: DateTime!
  lastUpdatedAt: DateTime

  # Content interface fields to enable content management
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

type Blog_Category implements Content & Node {
  id: ID!

  name: String
  slug: String! @unique

  # Content interface fields to enable content management
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

Save the file and check if you have any errors in your project by printing the project status:

    slicknode status

### Deploy

To deploy the changes to the cloud, simply run:

    slicknode deploy

Now you have a production ready content HUB with GraphQL API. To run the GraphQL API locally, follow [the development setup guide](guides/development-setup.md)

### Explore

To explore your newly created GraphQL API, open the playground:

    slicknode playground

This will open the GraphiQL playground for your API. _(It might ask you for your login credentials)_

To open the CMS data browser of your project:

    slicknode console

Show the GraphQL endpoint that you can use with your GraphQL clients:

    slicknode endpoint

## Next Steps

Explore the full potential of Slicknode by using the rich feature set. Here are a few topics that can get
you started:

- **[Tutorial](../tutorial):** Build a blog application in a step by step tutorial.
- **[Client Setup](../client-setup):** Connect your frontend application with the Slicknode server
- **[Writing Extensions](../extensions):** Write custom extensions to add any API and database to your application
- **[Auth](../auth):** Secure your application and write complex permission rules that span multiple tables.
- **[Data Modeling](../data-modeling/introduction):** Learn how to model the data for your application
