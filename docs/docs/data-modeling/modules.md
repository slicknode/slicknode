title: Modules: Creating GraphQL Modules with Slicknode
description: How to structure and create GraphQL modules in Slicknode. Initialization, structure, naming conventions and best practices.

# Modules

Modules are the top level building blocks inside your Slicknode project. They let you 
split your project into independent units that you can then reuse in different projects. 
They can be tested and developed in isolation before being deployed to the production environment
and multiple teams can work on different features independently. 

## Structuring Modules

How you structure your modules inside your project depends on the application that you are building. 
For example, if you are building a simple portfolio website with a blog, a team website
and some FAQ, you can create one module for each feature. 

If you have two existing modules that are used in multiple projects and you want to add some
functionality for one project only, you can create a module that extends the functionality
without changing the original modules. This removes the need for creating forks of the
modules and keeps them composable.

!!! info "Info"

    The modules will also all be listed separately in the CMS data browser. If you want to 
    group certain data objects or fields, you can add them to one module. 

## Creating a Module

To create a new module from scratch, use the Slicknode CLI inside of your project folder:
 
    slicknode module create news-feed

The name of the project can contain lower case letters, numbers and hyphens. Try to choose a short
but descriptive name. 

### Namespace

When you create a new module, you have to choose a namespace. The namespace will be prepended to 
all GraphQL types and fields (e.g. `NewsFeed_Article`) to prevent name collisions within your application. 
*(The name of every type has to be unique in a GraphQL schema according to the GraphQL specification)* 

Every namespace can only be used once inside each Slicknode project. You cannot have multiple
modules with the same namespace.

Pick something short and descriptive to keep the type and field names of your module as short as possible. 

Only types and fields of core modules are not prepended with the namespace. This ensures that you 
can always add new core functionality to your application without breaking your schema. 

### File Structure

When you create a new module, the following files and folders will be created in your project folder: 

    modules/
        news-feed/
            schema.graphql
            slicknode.yml

The file `slicknode.yml` contains the configuration of the module. 
*[See the reference](../reference/slicknode-yml.md) for more information*

The file `schema.graphql` is where you can define the schema of the module using the GraphQL SDL. 

[Learn how to create types](./object-types.md)
