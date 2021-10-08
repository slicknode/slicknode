# Custom Authentication Module

Slicknode provides you the building blocks to create custom authentication flows.
You can add multi factor authentication to your GraphQL API, use your existing user database
in an external system or leverage third party authentication providers like Facebook, Twitter,
Google or Auth0.

## Introduction

Slicknode uses JWT tokens to authenticate a user. To build a custom authentication module,
you simply add a new [Mutation](../../extensions/mutations.md) to your API that returns an auth token
set with `refreshToken` and `accessToken`.

The auth token set can be obtained from the Slicknode API via the `generateAuthTokens` mutation.

The `generateAuthTokens` mutation can only be invoked from your custom code with the `accessToken`
that is passed in the runtime context.

## Create Authentication Mutation

To create an authentication module, add a mutation with the authentication information as input values
that returns an auth token set. For example, if you receive an auth token from an external authentication
provider, we would use that as the input value.

### Schema

The schema could look something like this:

```graphql
# The input values of the mutation
input MyAuthProvider_LoginInput {
  # Auth token from MyAuthProvider
  token: String!
}

# Payload with the token set
type MyAuthProvider_LoginPayload {
  accessToken: String!
  accessTokenLifetime: Int!
  refreshToken: String!
  refreshTokenLifetime: Int!

  # Add more fields, like the user etc.
}

# Add mutation
extend type Mutation {
  MyAuthProvider_login(
    input: MyAuthProvider_LoginInput!
  ): MyAuthProvider_LoginPayload
}

# We store the external user ID on the user object
extend type User {
  MyAuthProvider_id: String @unique
}
```

### Mutation

In the resolver function of the login mutation we validate the token with the external auth provider
and, if successful, generate an auth token set via the Slicknode API:

```javascript
import fetch from 'node-fetch';
import SlicknodeClient from 'slicknode-client';

export default async function (payload, context) {
  // Get token from payload
  const { token } = payload.args.input;

  // Call external APIs to validate the auth token
  const response = await fetch(
    `https://example.com/isvalidtoken?token=${token}`
  );
  const result = await response.json();

  // Successful login
  if (!result.success) {
    throw new Error('Invalid auth token, please try again.');
  }

  // Create slicknode client to make requests to Slicknode API
  const client = new SlicknodeClient({
    ...context.api,
  });
  // Check if user exists
  const userResult = await client.fetch(
    `query ($id: String!) {
    user: getUserByMyAuthProvider_id(id: $id) {
      id
    }
  }`,
    { id: result.userId }
  );

  // User exists
  if (!userResult.data.user) {
    // Optionally load user information from auth service and create user on demand

    throw new Error(
      'Authentication successful, but user does not have an account in Slicknode'
    );
  }

  // Load auth token set
  const tokens = await client.fetch(
    `mutation ($input: generateAuthTokensInput!) {
    tokens: generateAuthTokens(input: $input) {
      accessToken
      accessTokenLifetime
      refreshToken
      refreshTokenLifetime
    }
  }`,
    {
      input: {
        user: userResult.data.user.id,
        module: '@private/my-auth-provider', // Pass the module ID here, can be found in slicknode.yml
      },
    }
  );

  // Check if we have errors
  if (tokens.errors && tokens.errors.length) {
    // Throw error with first error message back to client
    throw new Error(tokens.errors[0].message);
  }

  // Return auth tokens in the mutation payload
  return {
    data: tokens.data.tokens,
  };
}
```

## Client Integration

The created login mutation can then be invoked from your client application. This can be for example
after submitting some form values or when a user is returned from the auth provider to a redirect URL
where the token from the provider is passed as a parameter, etc.

Check the documentation of the auth provider for more details.
