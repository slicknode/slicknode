# GraphQL Server

GraphQL is a frontend developers dream: It shifts the power from the backend to the frontend
and exposes the entire functionality of your backend in a single API endpoint. 
In most cases, this is a HTTP or Websocket endpoint, but it can also be something else. 

You just ask for what you need and get a predictable result without having to
do anything in the backend. Each GraphQL server exposes all the available functionality
via a type-safe API. An introspection system describes the types and fields and is used
to automatically generate documentation, provide auto-complete functionality for your IDE
or generate type definitions (for TypeScript, Flow etc.) in your client applications.

There are three things you can send to a GraphQL API:

1.  A GraphQL query
1.  Query variables (optional)
1.  An operation name (optional)

They are usually sent in a `POST` request to the GraphQL endpoint as JSON payload, for example:

    curl -X POST https://my-project.us-east-1.slicknode.com \
        -H "Content-Type: application/json" \
        -d '{"query": "{viewer {user: {firstName}}}"}'

Luckily, in a frontend application, you don't have to write the raw requests. There are fully featured
GraphQL client libraries available that handle the network requests, caching, UI bindings etc.


