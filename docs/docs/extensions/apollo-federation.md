title: Apollo Federation: How to add Apollo Federation support to your GraphQL API
description: Get started with Apollo Federation for your Slicknode GraphQL API. Installation and usage example.

# Apollo Federation

Apollo Federation is an architecture that allows you to compose multiple GraphQL APIs into one data graph. This way
you can use a microservice architecture and split the functionality of your application into multiple independent
services. The GraphQL APIs are combined via a gateway that sits in front of the individual services. 
The services have to implement an advanced introspection system according to [the specification](https://www.apollographql.com/docs/apollo-server/federation/federation-spec/).
This provides the information about the service to the gateway to merge the APIs into the data graph. 

To learn more about federation and how to add it to your other GraphQL APIs, check out the [official documentation](https://www.apollographql.com/docs/apollo-server/federation/introduction/).

Slicknode comes with builtin support for Apollo Federation that can be added to your API by installing the
module. 


## Installation

To install Apollo Federation in your Slicknode project, you just have to install the module:

    slicknode module add apollo-federation
    
Afterwards deploy the changes to the cloud:

    slicknode deploy

That's it! Now your Slicknode project is ready to be used with Apollo Federation. 


## Usage

To get an overall understanding of Apollo Federation, how to setup the gateway and how to merge multiple
GraphQL APIs, we recommend reading the [official documentation](https://www.apollographql.com/docs/apollo-server/federation/introduction/) 
first.

The `apollo-federation` module adds the required introspection system along with all the data loading capabilities.
For all types in your Slicknode API that implement the `Node` interface, the keys are automatically added to enable
the extension of your types via external services. 

For example, the `User` type in your Slicknode API looks something like this (simplified version):

```graphql
type User implements Node @key(fields: "id") @key(fields: "email") @key(fields: "username") {
  id: ID!
  firstName: String
  lastName: String
  email: String @unique
  username: String @unique
  # ...
}
```

You can see that a key is added for every unique field as well as the `id` field. This is done by the apollo-federation
module automatically and the keys **do not** have to be added to the schema files of your own modules.
The keys allow you then to extend the user object in external services. 

Let's assume you have an account service outside of Slicknode that manages your customers and you want to connect the `Customer`
object of that service with the Slicknode `User` type. You could store only the `username` in the account service 
as a reference and extend the user type inside of your account service to add the customer information. 

The service definition of your external service could look something like this:

```graphql
extend type User @key(fields: "username") {
  username: String @external
  customer: Customer
}

type Customer {
  name: String
  accountBalance: Int!
}
```

When you merge the two services in the gateway, you have one API that allows you to fetch the `User` and the `Customer`
data in a single request:

```graphql
query LoadCurrentCustomer {
  # Viewer object is available from the Slicknode API
  viewer {
    user {
      firstName
      # The customer is loaded from the account service
      customer {
        accountBalance
      }
    }
  }
}
```

Besides installing the module, there are no additional changes required in the Slicknode API. This works out of the
box and allows you to extend your Slicknode project with other GraphQL APIs without creating any hard dependencies. 

The implementation of apollo federation in your other APIs depends on the GraphQL server you are using. Check
the documentation of your GraphQL server to learn how to add support for apollo federation. If you are using
NodeJS, we recommend the use of [Apollo Server](https://www.apollographql.com/docs/apollo-server/). 
