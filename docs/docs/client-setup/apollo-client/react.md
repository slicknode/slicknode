title: React: Setup Slicknode GraphQL API with React
description: How to setup Slicknode and Apollo Client in your React projects to use the GraphQL API.

# React

Apollo comes with a set of components to directly bind the client you created in [client setup](./index.md) to
your UI components. 

## Setup

To make the client available anywhere in your React component tree, you can use the `ApolloProvider` that is available
in the package `react-apollo`. You should place it somewhere high up in your component tree and higher than 
any component that needs to use the client. 

```javascript
import React from 'react';
import {render} from 'react-dom';

import {ApolloProvider} from 'react-apollo';

// Import client from wherever you created (and exported) it
import client from './client';

const App = () => (
  <ApolloProvider client={client}>
    <div>
      <h1>My Slicknode Project</h1>
    </div>
  </ApolloProvider>
);

render(<App />, document.getElementById('app'));
```

This is all that is required to setup your application to work with Apollo. 


## What's Next?

To learn how to use Apollo Client within your application, we recommend the [official documentation](https://www.apollographql.com/docs/react/) 
of the Apollo Client: 

-   **[Queries](https://www.apollographql.com/docs/react/data/queries/):** 
    Query data to use with your React components. 
-   **[Mutations](https://www.apollographql.com/docs/react/data/mutations/):** 
    Send mutations to update data on your server. 
