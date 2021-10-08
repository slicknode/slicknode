title: GraphQL Tutorial: Project Description
description: Project description for the Slicknode GraphQL tutorial

# Project Description

In this tutorial you will build a backend for an advanced multi user blogging application. 

## Requirements

Let's assume the following project requirements for our blogging application:

-   **Multiple users** can write content for the blog
-   A blog post should have the following data structure: Title, text, author, it should keep track of changed and created
    dates and should be assignable to a category
-   A blog post should have a **unique SEO-friendly URL**
-   An article in the **publishing workflow** can have multiple statuses: draft, published, archived
-   Every **authorized user can write comments** for each published blog post
-   Every **category** can have **multiple authors** and only authorized authors are allowed
    to publish articles in a category
-   The author should receive an **email notification** when someone posts a new comment for one of
    their blog posts
-   Only **admin users can add new authors** to a category

While this seems like a pretty standard application, the workflow in combination with all the
authorization rules usually require a significant amount of code that has to be written. 
With the declarative programming model of Slicknode, this becomes trivial. 
