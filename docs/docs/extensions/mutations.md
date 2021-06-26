title: Custom Mutations: Add mutation resolvers to Slicknode using NodeJS
description: Add external data sources, business logic and complex custom functionality to your Slicknode GraphQL API

# Mutations

Mutations are the fields in a GraphQL server that mutate the data of your application. They are almost identical
to the fields of the other types, the only difference is that they are executed sequentially instead of in
parallel. When you implement custom mutations, you don't have to worry about this as this is handled by 
the GraphQL execution engine. The implementation of a custom mutation is also almost identical to that of a
[resolver](./resolvers.md) for other types. However, there are a few Slicknode specific conventions to 
enforce best practices. 

Creating a mutation can be done in 3 simple steps: 

1.  **[Update Schema:](#update-schema)** Define the input and return values of the mutation and add the mutation field to the
    GraphQL schema. 
1.  **[Create Resolver:](#create-resolver)** Write the [handler](./handlers.md) with your custom logic that should be executed
    whenever the mutation is invoked.
1.  **[Configure Permissions:](#configure-permissions)** Configure who is allowed to run the mutation. 


## Update Schema

You can add a mutation to your GraphQL API by extending the `Mutation` type in the `schema.graphql` file of your module
using the GraphQL Schema Definition Language. For example, to add a user registration to your blog application,
the `schema.graphql` file of you blog module could look something like this: 

```graphql
input Blog_RegisterUserInput {
  email: String!
  password: String!
}

type Blog_RegisterUserPayload {
  success: Boolean!
  message: String!
}

extend type Mutation {
  Blog_registerUser(input: Blog_RegisterUserInput!): Blog_RegisterUserPayload
}
```

A mutation always has to have an argument `input` and a return value (payload). 
The input argument type needs to be required and the payload needs to be nullable. You can only
add input object types as the input argument, that way you can later extend the input type and add more 
values without having to update the queries in your applications. 

## Create Resolver

The custom logic is implemented with a handler and then configured as a resolver. This is identical to 
[creating custom resolvers](./resolvers.md) for other types.

First create the handler with the mutation logic. It is highly recommended to create a unit test and then develop 
and test the functionality on your local machine. For simplicity, we will just show the handler here. 

**modules/blog/src/resolvers/Mutation:**

```javascript
module.exports = async function(payload, context) {
  // Get input values from payload
  const {email, password} = payload.args.input;
  
  // Call external APIs, process data, add user to database etc.
  
  // Return payload of mutation in the data attribute of the return value
  return {
    data: {
      success: true,
      message: `User with email address ${email} was successfully added`
    }
  };
};
```


Configure in the `slicknode.yml` file of the module which handler should be used for the mutation field.

**modules/blog/slicknode.yml:**
```yaml
# Runtime needs to be enabled for code execution
runtime:
  engine: nodejs@8

# Resolver map
resolvers:
  # Mutations are always part of the builtin 'Mutation' type
  Mutation:
    # The mutation name as defined in the schema (prepended with the module namespace to avoid name collisions)
    Blog_registerUser:
      # Path to the JS source file where the custom resolver logic is implemented (within module)
      handler: src/resolvers/Mutation.Blog_registerUser
```

## Configure Permissions

By default, no client is allowed to execute a mutation. Permission has to be granted explicitly for custom
mutations, which can be done with a permission document for the Mutation type. 
You can place a permission query document in any module and grant access to mutations. In most cases you would
configure the permissions in the module where the mutation is implemented. 

**modules/blog/permissions/Mutation.graphql**

```graphql
query MutationPermissionQuery {
  scope(role: ANONYMOUS, fields: ["Blog_registerUser"])
}
```

In this case, we want everyone to be able to register as a new user, therefore we define the scope with the
role `ANONYMOUS`. To allow access to the mutation `Blog_registerUser` we have to add the mutation as a field
to the scope. You can also grant access to multiple mutations at once with the same query by adding them to the
fields input argument. 

## Querying

After successful configuration and deployment, you can query the mutation like any other field of your API directly
via the playground or from your applications: 

```graphql
mutation {
  Blog_registerUser(input: {
    email: "test@example.com",
    password: "Mypassword"
  }) {
    success
    message
  }
}
```
