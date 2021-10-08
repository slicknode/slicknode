# Email / Password Authentication Module

The email password authentication module authenticates a user on the Slicknode GraphQL server with its email 
address and password that is stored in the main `User` object. 

## Installation

Add the email password authentication module to your project: 

    slicknode module add auth-email-password
    
Deploy the changes to the server:

    slicknode deploy
    
## Schema

The email password authentication module adds the following types and mutations to your schema:

```graphql
extend type Mutation {
  loginEmailPassword(input: loginEmailPasswordInput!): loginEmailPasswordPayload
}

input loginEmailPasswordInput {
  """The password to log in"""
  password: String!

  """Email address of the user"""
  email: String!
}

type loginEmailPasswordPayload {
  accessToken: String!
  accessTokenLifetime: Int!
  refreshToken: String!
  refreshTokenLifetime: Int!
  user: User!
}
```
