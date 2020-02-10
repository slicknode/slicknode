# [Slicknode](https://slicknode.com "GraphQL CMS + Framework") 

[![npm version](https://badge.fury.io/js/slicknode.svg)](https://badge.fury.io/js/slicknode) [![CircleCI](https://circleci.com/gh/slicknode/slicknode.svg?style=shield)](https://circleci.com/gh/slicknode/slicknode)

GraphQL based Application Framework and CMS for rapid software development: 

Declaratively define your backend using GraphQL SDL and get a production ready Serverless GraphQL API with 
CMS instantly. Works with existing data sources and GraphQL APIs. 

**Automate the hard parts of GraphQL and build:**

-   Multi-tenant SaaS-Applications
-   CMS for custom demanding websites (for example with customer login)
-   Productivity tools with complex requirements + permissions
-   etc.

**Features:**

-   Instant **GraphQL API** on managed cloud infrastructure
-   **Headless CMS**
-   Modular architecture
-   Automatic **database migrations**
-   [Declarative permission model](https://slicknode.com/docs/auth/authorization/) (for multi tenant SaaS, customer facing apps, enterprise etc.)
-   Use with any API and database
-   Powerful [data modeling features](https://slicknode.com/docs/data-modeling/introduction/) with
    **[relations](https://slicknode.com/docs/data-modeling/relations/), 
    [interfaces](https://slicknode.com/docs/data-modeling/interfaces/introduction/), 
    [enum types](https://slicknode.com/docs/data-modeling/enum-types/)** etc.
-   **Multi-Stage** development workflow
-   Works with your favorite technologies (React, Angular, Vue, Javascript, iOS, Android etc.)
-   Extend existing GraphQL APIs
-   [Extensible](https://slicknode.com/docs/extensions/) with custom code (Javascript, TypeScript, Flow etc.)

## Installation

The Slicknode CLI can be installed via the terminal using npm. ([How to get npm?](https://docs.npmjs.com/getting-started/installing-node))

    npm install -g slicknode@latest
    

## Usage

### Initialize

To create a new Slicknode project, navigate to the folder where you want to create
your new project and run: 

    slicknode init my-fancy-project
    
    # Change into the newly created project directory
    cd ./my-fancy-project

*(This will ask for your Slicknode login information when run for the first time. Enter the login information that you used when you [signed up](https://slicknode.com).)*

### Create a module

[Modules](https://slicknode.com/docs/data-modeling/modules.md) are the top level building blocks that let you organize your project in a modular way. 
Put each functionality of your project in a separate module. That way they can easily be
reused in other projects. 

To create a blog for example, run: 

    slicknode module create blog
    
It will suggest a [namespace](https://slicknode.com/docs/data-modeling/modules.md#namespace) and the label that will be displayed in the data browser.
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
type Blog_Article implements Node & TimeStampedInterface {
    id: ID!
    title: String!
    slug: String! @unique
    text: String! @input(type: MARKDOWN)
    author: User!
    createdAt: DateTime!
    lastUpdatedAt: DateTime
    comments: [Blog_Comment!] @relation(path: "Blog_Article=article.Blog_Comment")
}

"""
Comments for blog articles
"""
type Blog_Comment implements Node & TimeStampedInterface {
    id: ID!
    text: String! @input(type: TEXTAREA)
    author: User
    article: Blog_Article!
    createdAt: DateTime!
    lastUpdatedAt: DateTime
}
```

Save the file and check if you have any errors in your project by printing the project status.
Run the status command from the project folder:

    slicknode status

### Deploy

To deploy the changes to the cloud, simply run: 

    slicknode deploy
    
Now you have a production ready GraphQL backend and a fully functional CMS.

### Explore

To explore your newly created GraphQL API, open the playground: 

    slicknode playground
    
This will open the GraphiQL playground for your API. *(It might ask you for your login credentials)*

To open the CMS data browser of your project: 

    slicknode console
    
Show the GraphQL endpoint that you can use with your GraphQL clients:

    slicknode endpoint


## Next Steps

Explore the full potential of Slicknode. Here are a few topics that can get
you started:

[Join our Slack community!](https://slicknode.com/slack)

-   **[Tutorial](https://slicknode.com/docs/tutorial):** Build an advanced blog application in a step by step tutorial.
-   **[Client Setup](https://slicknode.com/docs/client-setup):** Connect your frontend application with the Slicknode server
-   **[Writing Extensions](https://slicknode.com/docs/extensions):** Write custom extensions to add any API and database to your application
-   **[Auth](https://slicknode.com/docs/auth):** Secure your application and write complex permission rules that span multiple tables.
-   **[Data Modeling](https://slicknode.com/docs/data-modeling/introduction):** Learn how to model the data for your application


Follow us on [Twitter](https://twitter.com/slicknode) and [Facebook](https://www.facebook.com/SlicknodeHQ/).
