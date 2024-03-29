# [Slicknode](https://slicknode.com 'GraphQL CMS + Framework')

[![npm version](https://badge.fury.io/js/slicknode.svg)](https://badge.fury.io/js/slicknode)
[![CircleCI](https://circleci.com/gh/slicknode/slicknode.svg?style=shield)](https://circleci.com/gh/slicknode/slicknode)
[![Twitter Follow](https://img.shields.io/twitter/follow/slicknode?style=social)](https://twitter.com/intent/user?screen_name=slicknode)

Slicknode is an all-in-one GraphQL backend, gateway and Headless CMS for creating custom backends and digital products with content management. It consist of 3 main components:

- **GraphQL Gateway:** Compose builtin modules, custom data models and 3rd party APIs in a unified GraphQL API in minutes.
- **Content/Data Modeling:** Declaratively model your content and data using the GraphQL schema definition language. Slicknode generates flexible CRUD queries and mutations with filters, pagination, authorization, etc. Automatic database migrations based on the schema definition enable full version control (review, branching, merge, etc.), CI-Pipeline integration, offline development.
- **Admin UI:** Slicknode provides an automatically generated Admin-UI based on your data model with advanced content workflows (Draft → Review → Published), Localization, Version-History, etc.

Deploy to the [**managed Slicknode Cloud**](https://slicknode.com/pricing/) with a single command (with auto scaling, global GraphQL CDN, serverless infrastructure), or **self-host** in any data center with any cloud provider.

[![Headless GraphQL CMS](./assets/info-graphic.png)](https://slicknode.com/)

**Links:**

- [Getting Started](https://slicknode.com/docs/quickstart/)
- [Docs](https://slicknode.com/docs/)
- [Website](https://slicknode.com)
- [Slack Community](https://slicknode.com/slack/)

## Why Slicknode?

Most content management systems are isolated systems. Combining them with your own or 3rd party APIs usually requires extensive knowledge about the CMS architecture and is time consuming. You can do it in the frontend using a headless CMS, but that adds complexity, is limited and has to be done by hand. Exending core functionality, for example as "simple" as adding a `stripeCustomerId` to the user object, is often hard or impossible. If you need to add custom business logic or need advanced access control, you usually need to write a custom backend, which is time consuming.

On the other hand, there are solutions to create backends with business logic, but they often lack content managment features like localization, non destructive editing of live content (Draft → Review → Published), Admin UI, version history etc.

Slicknode combines both by providing reusable building blocks, a modular architecture and a declarative programming model. An open-source framework to create custom backends and content management infrastructure with minimal code and minimal knowledge, while at the same time providing functionality to extend and customize everything.

Here are some of the problems that Slicknode solves:

- **Git-Workflows:** The entire application structure and content model is stored in the local
  codebase, which can then be managed with version control like git and enable essential workflows like
  code review, reversing changes, feature branches, cloning, CI/CD integration etc.
- **Modular Architecture:** It is often hard to reuse functionality or data models across projects.
  If you are building similar solutions, you often have to recreate the same thing over and over. Slicknode
  has a modular architecture at its core. This allows you to reuse, share and organize complex projects.
- **Flexibility:** With a design around the open source GraphQL standard, you can combine Slicknode with any frontend technology,
  API, database, or existing IT infrastructure. Merge multiple GraphQL APIs into a unified data graph and bring
  it to the global edge network with Slicknode Cloud for low latencies.
- **Scalability:** Slicknode was designed with a cloud native architecture from the ground up. The [Slicknode Cloud](https://slicknode.com/pricing/) is powered by serverless computing
  and a globally distributed CDN, it scales instantly to any traffic spikes without managing infrastructure.
  It has no single point of failure and a self-healing infrastructure that seamlessly handles outages of entire availability zones.

## Features:

- Instant **GraphQL API** on managed cloud infrastructure (or self-hosted)
- Modular architecture
- Custom publishing workflows (e.g.: Draft > Review > Translation > Published)
- Strong **data consistency** with referential integrity and automatic **database migrations**
- Internationalization
- [Declarative permission model](https://slicknode.com/docs/auth/authorization/) (for multi tenant SaaS, customer facing apps, enterprise etc.)
- Powerful [content modeling features](https://slicknode.com/docs/data-modeling/introduction/) with
  **[relations](https://slicknode.com/docs/data-modeling/relations/),
  [union types](https://slicknode.com/docs/data-modeling/union-types/),
  [interfaces](https://slicknode.com/docs/data-modeling/interfaces/introduction/),
  [enum types](https://slicknode.com/docs/data-modeling/enum-types/)** etc.
- **Multi-Stage** development workflow
- Works with any frontend technology (React, Angular, Vue, Javascript, iOS, Android etc.)
- Extend existing GraphQL APIs
- [Apollo Federation](https://slicknode.com/docs/extensions/apollo-federation/)
- [Extensible](https://slicknode.com/docs/extensions/) with custom code (Javascript, TypeScript, Flow etc.)

# Quickstart

This is a quickstart tutorial to create a Slicknode project from scratch. If you would rather start with
a fullstack application, check out our [NextJS blog starter](https://github.com/slicknode/starter-nextjs-blog)

To get started with [Slicknode](https://slicknode.com), you need a Slicknode Cloud account.
You can [sign up for free here](https://console.slicknode.com/register) _(No credit card required)_

Check out this 10-minute tutorial which walks you through everything you need to get started:

[![Slicknode Getting Started](https://img.youtube.com/vi/VGpm6J-0dKg/0.jpg)](https://www.youtube.com/watch?v=VGpm6J-0dKg)

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

Save the file and check if you have any errors in your project by printing the project status.
Run the status command from the project folder:

    slicknode status

### Deploy

To deploy the changes to the cloud, simply run:

    slicknode deploy

Now you have a production ready content HUB with GraphQL API.

### Explore

To explore your newly created GraphQL API, open the playground:

    slicknode playground

This will open the GraphiQL playground for your API. _(It might ask you for your login credentials)_

To open the CMS data browser of your project:

    slicknode console

Show the GraphQL endpoint that you can use with your GraphQL clients:

    slicknode endpoint

## Next Steps

Explore the full potential of Slicknode. Here are a few topics that can get
you started:

[Join our Slack community!](https://slicknode.com/slack)

- **[Tutorial](https://slicknode.com/docs/tutorial):** Build an advanced blog application in a step by step tutorial.
- **[Client Setup](https://slicknode.com/docs/client-setup):** Connect your frontend application with the Slicknode server
- **[Writing Extensions](https://slicknode.com/docs/extensions):** Write custom extensions to add any API and database to your application
- **[Auth](https://slicknode.com/docs/auth):** Secure your application and write complex permission rules that span multiple tables.
- **[Data Modeling](https://slicknode.com/docs/data-modeling/introduction):** Learn how to model the data for your application

Follow us on [Twitter](https://twitter.com/intent/user?screen_name=slicknode) and [Facebook](https://www.facebook.com/SlicknodeHQ/).
