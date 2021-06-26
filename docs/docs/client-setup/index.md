title: Client Setup: Which GraphQL client you should use?
description: A guide to pick a GraphQL client for your Slicknode GraphQL API

# Connecting Your Frontend

To connect your frontend applications to the Slicknode backend, you can use pretty much any [GraphQL client](./clients.md). 


## Choosing a Client

There are two clients available that automatically add authentication headers, keep track of expiration times
for the auth tokens and refresh the tokens in the background without interruption to the client. 

-   **[apollo-client + slicknode-apollo-link](./apollo-client):** 
    A full featured client library with cache, local state management, error handling and UI bindings for popular frontend
    frameworks. 
    
    [slicknode-apollo-link](https://github.com/slicknode/slicknode-apollo-link) adds easy setup and handling
    of authentication and automatic token refresh. 
    
    Recommended for most **frontend applications** (React, Vue, Angular, iOS, Android etc.)
    
-   **[slicknode-client](https://github.com/slicknode/slicknode-client):** A lightweight GraphQL client that
    handles authentication headers and refreshes Slicknode auth tokens automatically. 
    
    Recommended for simple applications and access from other backends / [Slicknode handlers](../extensions/handlers.md).

!!! note "Info"

    To learn more about the authentication process with Slicknode GraphQL servers, read the 
    [authentication documentation](../../auth/authentication).

