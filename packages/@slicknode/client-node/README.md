# Slicknode GraphQL Client for Node JS

[![npm version](https://badge.fury.io/js/@slicknode/client-node.svg)](https://badge.fury.io/js/@slicknode/client-node)
[![CircleCI](https://circleci.com/gh/slicknode/@slicknode/client-node.svg?style=shield)](https://circleci.com/gh/slicknode/@slicknode/client-node)

A lightweight client to make requests to a slicknode GraphQL server. Sends GraphQL queries while automatically
adding authentication headers, refreshing access tokens in the background on expiration and with support
for authenticators.

**Note:** If you are looking for a client to build a frontend application, we recommend using [slicknode-apollo-link](https://github.com/slicknode/slicknode-apollo-link),
the Slicknode version of the [Apollo Client](https://www.apollographql.com/client) with auth support and recommended
defaults.

## Installation

The client can be installed via npm (GraphQL is a peer dependency):

    npm install -S @slicknode/client-node graphql

## Why Slicknode Client?

While you can use any GraphQL client to send queries to a Slicknode GraphQL server, Slicknode client simplifies the management
of auth tokens that you would otherwise have to manually set in your client. It keeps track of token expiration times
and automatically refreshes them in the background without interruption.

## Usage

Create a client by providing the slicknode GraphQL endpoint:

```javascript
import Client from '@slicknode/client-node';
import gql from 'graphql-tag';

const client = new Client({
  endpoint: 'http://myproject.slicknode.com/',
});

// Now you can start sending GraphQL queries
const variables = {};
const query = gql`
  query {
    viewer {
      user {
        email
      }
    }
  }
`;

client
  .fetch(query, variables)
  .then(({ data, errors }) => {
    console.log('Data loaded', data);
  })
  .catch((err) => {
    console.log('Something went wrong: ', err.message);
  });
```

## Authentication

By default, there are no authentication headers sent to the GraphQL server, so the
client is making requests as a guest. To determine which user accesses the API, Slicknode uses JSON Web Tokens
that need to be sent in the HTTP headers of each request.

To obtain an access token from your GraphQL server, a user needs to authenticate itself via a mutation that is
available on the Slicknode server (for example email / password). You can install one of the [available authentication
modules](#available-authentication-adapters) or build your own.

The access and refresh tokens with their expiration times that are returned by that mutation need to be
set in the `@slicknode/client-node` instance. (`client.setAuthTokenSet(myTokenSet)`)

This is simplified with the use of authenticators.

### Authenticators

An authenticator is a function that loads the auth token set from the Slicknode API and passes it to the client.
You just have to install [the right authenticator](#available-authentication-adapters) and pass it to the authenticate method.

**Example:**

```javascript
import loginEmailPassword from 'slicknode-auth-email-password';
import Client from '@slicknode/client-node';

const email = 'info@slicknode.com';
const password = '12345xyz';
const client = new Client({
  endpoint: 'http://myproject.slicknode.com/',
});
client
  .authenticate(loginEmailPassword(email, password))
  .then(() => {
    console.log('Login was successful');
  })
  .catch((err) => {
    console.log('Login failed', err.message);
  });

// To log a user out
client
  .logout()
  .then(() => {
    console.log('Logout successful');
  })
  .catch((err) => {
    console.log('Something went wrong: ', err.message);
  });
```

The Slicknode client persists the auth tokens to localStorage or to an in memory storage if localStorage is
not available (NodeJS). The authentication headers are automatically added to each subsequent request.

When the accessToken expires, Slicknode uses the stored refreshToken to obtain a new token set without interruption
to the client. That way you can just fetch data and let the Slicknode client handle the authentication headers.

### Available Authentication Adapters

You can use any of the following authentication adapters or build your own:

- **[Email / Password](https://github.com/slicknode/slicknode-auth-email-password):** Authentication with
  email address and password

Once a user is authenticated, the slicknode client automatically takes care of
refreshing the access token in the background.

To learn more about authentication and auth tokens for Slicknode servers, check out the section for authentication in
the Slicknode documentation.

#### Custom authenticator

An authenticator has the following function signature:

```typescript
export type AuthTokenSet = {
  accessToken: string;
  accessTokenLifetime: number;
  refreshToken: string;
  refreshTokenLifetime: number;
};

export type Authenticator = (client: Client) => Promise<AuthTokenSet>;
```

You can use the instance of the client that is being passed to the authenticator to run mutations
on your GraphQL server and obtain the tokens.
