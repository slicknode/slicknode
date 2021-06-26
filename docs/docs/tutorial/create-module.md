title: GraphQL Tutorial: Create Module
description: How to create a module for your Slicknode GraphQL project. 

# Create Module

Modules are the top level building blocks of a Slicknode project. They let you organize your project into small
logical pieces. To learn more about modules, [click here](../data-modeling/modules.md)

For our blog application, all the parts that we need to meet [the requirements](description.md#requirements) are
related, so we only need one module that we call `blog`.

## Instructions

From the root folder of our project, we create the module: 

    slicknode module create blog

We need to enter a namespace and a label for the admin interface. The namespace will be prepended to all types
of the module. We can just use the defaults here by pressing enter. 

## Explanations

Inside of our project, we should now have the following additional files:

    modules/
        blog/
            slicknode.yml
            schema.graphql

Slicknode created a modules folder where we will place all the slicknode modules and it created the `blog/` folder
for our blog module. 
There are two files inside of our modules folder:

- **`modules/blog/slicknode.yml`:** This holds the configuration of our module (we will get back to that later).
- **`modules/blog/schema.graphql`:** This is where we can place all the type definitions using the GraphQL SDL.