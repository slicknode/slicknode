title: Custom Resolvers: Add resolvers to Slicknode using NodeJS
description: Add external data sources, business logic and complex custom functionality to your Slicknode GraphQL API

# Resolvers

Resolvers are the functions that return the data of the fields when you send a GraphQL query to the
Slicknode API. You can write your own custom resolvers as [handlers](./handlers.md) in your Slicknode
modules and extend any object type of your application, enrich it with data from 3rd party APIs, implement custom
logic or easily embed existing legacy APIs in your Slicknode application. 

This enables you to use Slicknode with pretty much any existing database and API.

## Creating a Resolver

To create a new resolver in Slicknode, define in the `slicknode.yml` file of the module which [handler](./handlers.md)
should be executed for which field. The configuration for the resolvers is defined in a two dimensional map that 
includes the type name and the field name: 

**modules/my-module/slicknode.yml:**
```yaml
# Runtime needs to be enabled for code execution
runtime:
  engine: nodejs@8

# Resolver map
resolvers:
  # The type to add the fields to. `Query` is always the root query type
  Query:
    # The field name (prepended with the module namespace to avoid name collisions)
    MyModule_hello:
      # Path to the JS source file where the custom resolver logic is implemented (within module)
      handler: src/resolvers/Query.MyModule_hello
```

For the field to be exposed via the GraphQL API we have to add it to 
the `schema.graphql` file of the module and specify the return types and potential input arguments:

**modules/my-module/schema.graphql:**

```graphql
extend type Query {
  MyModule_hello(name: String): String
}
```

This adds a field with the name `MyModule_hello` to the `Query` type that takes a name with input type `String` as an 
input argument. 

Last we can implement the resolver as a simple [handler](./handlers.md) with plain javascript: 

**modules/my-module/src/resolvers/Query.MyModule_hello.js:**

```javascript
module.exports = async function(payload, context) {
  // Call external APIs, process data etc.
  
  // We return the name that was provided as an input argument. 
  // If we don't have an input argument, we greet the stranger...
  return {
    data: 'Hello ' + (payload.args.name || 'Stranger')
  };
};
```

## Querying the Resolver

With the resolver in place we can fetch the data via the Slicknode GraphQL endpoint like for any
other field:

```graphql
query SayHello {
  MyModule_hello(name: "John")
}
```
