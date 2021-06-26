title: Apollo Client: Setup Apollo Client with Slicknode
description: How to use Apollo Client with the Slicknode GraphQL API. Initialization, Configuration and Usage with authentication.

# Apollo Client

This guide shows you how to setup and use [apollo-client](https://www.apollographql.com/client) with 
[slicknode-apollo-link](https://github.com/slicknode/slicknode-apollo-link).


## Setup

First we need to install a few dependencies: 

```bash
npm install apollo-client slicknode-apollo-link graphql graphql-tag apollo-cache-inmemory apollo-link apollo-link-error apollo-link-http --save
```

## Creating the Client

To create an instance of the client in your code, you need the endpoint of your Slicknode project. 
You can get the Slicknode endpoint by running `slicknode endpoint` in the root folder of your project. 

Then create the client in your frontend application and replace the endpoint:

```javascript
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { onError } from 'apollo-link-error';
import { HttpLink } from 'apollo-link-http';
import SlicknodeLink from 'slicknode-apollo-link';
// import 'isomorphic-fetch'; // Add isomorphic fetch if fetch is not available in your environment (NodeJS)

// Replace with your Slicknode endpoint 
const SLICKNODE_ENDPOINT = 'https://myproject.slicknode.com';

const slicknodeLink = new SlicknodeLink({
  debug: true // Writes auth debug info to console, disable in production
});

const client = new ApolloClient({
  link: ApolloLink.from([
    slicknodeLink,
    // Error link to show errors in console (optional)
    onError(({ graphQLErrors, networkError }) => {
      if (graphQLErrors && console) {
        graphQLErrors.map(({ message, locations, path }) =>
          console.log(
            `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
          ),
        );
      }
  
      if (networkError && console) {
        console.log(`[Network error]: ${networkError}`);
      }
    }),
    // Network link to make HTTP requests to the API
    new HttpLink({
      uri: SLICKNODE_ENDPOINT,
      credentials: 'same-origin',
    })
  ]),
  cache: new InMemoryCache()
});
```

That's it! Now we can start fetching data. 


## Sending Queries

To query data with the ApolloClient, we use the `gql` template tag that converts
plain GraphQL strings into GraphQL query objects.

```javascript
import gql from 'graphql-tag';

// ...

client.query({
  query: gql`
    {
      viewer {
        user {
          email
        }
      }
    }
  `
})
    .then(result => console.log(result))
    .catch(err => console.error(err.message));
```

When you open up your console and execute the code, you should see a log output with a data property that
looks something like this: 

```json
{
  "data": {
    "viewer": {
      "user": null
    }
  }
}
```

The `viewer` field always returns information about the current user that is accessing the data. We have not done 
any authentication yet, therefore the `user` field is `null`.


## Authentication

To authenticate a user, the [authentication module](../../auth/authentication/#authentication-modules) 
has to be installed in our project, depending on the type of authenticatio that you want to use. 
This adds the login mutation to our GraphQL API that we can then query with our client.


### Setup

Let's assume we want to use email password authentication. First, we have to make sure 
that the module with the mutation is available on our server. 

To install the module, add it to your backend project via the Slicknode CLI: 

```bash
slicknode module add auth-email-password
```

Then deploy the changes to the cloud:

```bash
slicknode deploy
```

### Authenticate

To authenticate a user, execute the mutation via the client instance like any other query. You only have to
add the directive `@authenticate` to the query, which tells the `SlicknodeLink` to use the returned tokens for
authentication handling. 

In your application where you use the client, you can authenticate a user like this: 

```javascript
client.query({
  query: gql`mutation LoginUser($email: String!, $password: String!) {
    loginEmailPassword(input: {
      email: $email,
      password: $password
    }) @authenticate {
      accessToken
      refreshToken
      accessTokenLifetime
      refreshTokenLifetime
    }
  }`,
  variables: {
    email: 'email@example.com',
    password: 'mysecretpassword'
  }
})
  .then((result) => {
    // Check if mutation succeeded
    if (result.data && result.data.loginEmailPassword) {
      console.log('Login successful');
    } else {
      console.log('Login failed, mutation response:', result);
    }
  })
  .catch(err => {
    console.log('Something went wrong: ', err.message);
  });
```

### Sending Requests

After successful authentication the authentication headers are automatically added to the
requests by the SlicknodeLink and all queries are executed with the current user: 

```javascript
// ...

client.query({
  query: gql`
    {
      viewer {
        user {
          email
        }
      }
    }
  `
})
    .then(result => console.log(result))
    .catch(err => console.error(err.message));
```

This query now returns the current user's email address:


```json
{
  "data": {
    "viewer": {
      "user": {
        "email": "email@example.com"
      }
    }
  }
}
```

You can also check the debug output of the SlicknodeLink in the console to get information about the authentication
process.

### Logout

When you want to log the user back out, you can do so by running the `logoutUser` mutation. You should pass the
current `refreshToken` to the logout mutation to invalidate the token:

```javascript
client.query({
  query: gql`mutation LogoutUser($token: String) {
    logoutUser(input: {refreshToken: $token}) {
      success
    }
  }`,
  variables: {
    // Get the current refreshToken from the SlicknodeLink instance to invalidate it on the server
    token: slicknodeLink.getRefreshToken()
  }
})
  .then(result => {
    console.log('Logout successful', result.data && result.data.logoutUser);
  })
  .catch(err => {
    console.log('Something went wrong: ', err.message);
  });
```

## UI Bindings

You can use the client directly to load and update data or use one of the available UI bindings that are
available for the major frontend frameworks: 

-   [React](./react.md)
-   [Angular](https://www.apollographql.com/docs/angular/) 
-   [Vue](https://akryum.github.io/vue-apollo/guide/)
