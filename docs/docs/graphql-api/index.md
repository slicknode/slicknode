

# GraphQL API

Slicknode provides a production ready GraphQL-API for your application that you can use with any programming
language and framework. It can be used with any of the fully featured GraphQL clients like 
[Relay](https://facebook.github.io/relay/) or [Apollo Client](https://www.apollographql.com/client). 
You can also query the API by simply sending a raw HTTP request.

If you are not yet familiar with GraphQL, we commend to read 
[this introduction to GraphQL queries and mutations](https://graphql.org/learn/queries/) from the 
official GraphQL site.

The easiest way to explore the API with all its features is to open the playground by navigating to your
project folder and running the following command: 

    slicknode playground

You can write and test queries with the autocomplete functionality and read the documentation of all the types
and queries. The playground is also automatically updated whenever you deploy a new version of your
project. 


## Using the API

There are a lot of [GraphQL clients](../client-setup/clients.md) available and they can all be used with the Slicknode GraphQL API.
In most cases, you want to connect a UI to your backend, like a React, Vue or Angular application.

**Guide:** [Connect your Frontend](../client-setup)


## APIs

Slicknode provides the following APIs to read and manipulate your data: 

- [Query API](./query-api.md) - API to perform read operations
- [Mutation API](./mutation-api.md) - API to perform write, delete and update operations
