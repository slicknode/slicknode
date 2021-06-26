# Handlers

The custom code that you write is implemented in so called handlers. A handler is a javascript file that
exports a javascript function. Two arguments are passed to each handler: 

-   **Payload:** The first argument is a payload object that contains data from the event that dispatched
    the handler. Check the documentation for each event to see what the payload for this event looks like.
-   **Context:** The second argument is a context object which contains information about the current
    request and environment, like environment variables, the project alias, the GraphQL API endpoint to
    make requests back to the GraphQL API etc. 

Some handlers require you to return data. You can either return plain javascript values or return a promise that 
resolves the value, in case you need asynchronous code execution like calling an external API.

You can have any number of handlers in a module. The handlers just need to be located inside of the module folder. 
You cannot reference javascript files in a parent directory.

## Example Handler

A simple handler could look something like this: 

**modules/my-module/src/handlerName.js:**
```javascript

// IMPORTANT: Avoid putting code other than dependency imports 
// outside of the function as this might cause memory leaks 
// when not implemented correctly. 

module.exports = function(payload, context) {
  // Custom should be added here.
  
  // Access the context and payload as needed
  console.log('Users IP address', context.request.ip);
  console.log('Handler payload', payload);
  console.log('Project alias', context.project.alias);
  
  // Return some values
  return Date.now();
}
```

We just defined a javascript function that takes the payload and context values as input arguments and returns
a computed value, in this case the current timestamp. 

## Asynchronous Handlers

If you need to invoke asynchronous code, you can return a promise in the handler function that resolves
the return value of the function. The promise will automatically be resolved by the slicknode runtime. 

**Example with async / await (recommended):**

```javascript
require('isomorphic-fetch');

// IMPORTANT: Avoid putting code other than dependency imports 
// outside of the function as this might cause memory leaks 
// when not implemented correctly. 

module.exports = async function(payload, context) {
  try {
    // Call external API
    const response = await fetch('https://example.com/api');
    
    // If we have JSON response, return parsed JSON
    return await response.json();
  } catch (e) {
    // Catch the error and add a meaningful error message, then rethrow error
    throw new Error(`Error calling API: ${e.message}`);
  }
}
``` 

**Example with Promise:**

```javascript
require('isomorphic-fetch');

// IMPORTANT: Avoid putting code other than dependency imports 
// outside of the function as this might cause memory leaks 
// when not implemented correctly. 

module.exports = function(payload, context) {
  return new Promise((resolve, reject) => {
    fetch('https://example.com/api')
      .then(response => {
        if (response.status === 200) {
          return response.json();
        }
        reject(new Error('Error calling API'));
      })
      .then(data => {
        resolve(data);
      })
      .catch((error) => {
        reject(new Error(`Error calling API: ${error.message}`));
      });
  });
}
```

## Dependencies

Dependencies of third party libraries and custom modules are handled like in a regular NodeJS application. 

### npm Modules

You can install any [npm module](https://www.npmjs.com/) by adding them as a dependencies to the `package.json`
of the corresponding slicknode module. To add an npm module to your module navigate to the module 
folder and install it via npm: 

```bash
# Navigate to module folder
cd modules/my-module/
# To install the aws-sdk for example: 
npm install aws-sdk --save
```

!!! important

    If you are installing npm modules that are only needed for development, like test runners, build tools etc.,
    make sure they are only added as dev dependencies to keep the module size small. (npm install **--save-dev** npm-module-name) 
    
Afterwards you can require the module in your handler files: 

```javascript
// Import the installed npm-module
const AWS = require('aws-sdk');

module.exports = function(payload, context) {
  // Use AWS in your handler function...
}
```

Each module has its own `package.json` file which lets you manage the dependencies independently: For example
you can have version 2 of a library installed in one module and version 3 of the same library in another
module. This facilitates an easy gradual upgrade path for large applications and reduces dependencies. 

### Relative Imports

The slicknode runtime also supports relative imports. This enables you to structure your codebase and
split the logic into smaller pieces. That way you can also reuse code between different handlers
in the same module without having to duplicate the code. The behavior is the same as in an ordinary NodeJS 
application.

Let's assume you have a function that calls a custom API and you want to use that fetcher in multiple handlers.
You would create one node module for the fetcher and one for each handler that uses the fetcher.

**api.js:**

```javascript
require('isomorphic-fetch');

module.exports = async function(url) {
  const response = await fetch(`http://mycompany.com/${url}`);
  return await response.json();
}
```

**myHandler.js:**

```javascript
const api = require('./api');

module.exports = async function(payload, context) {
  // Fetch result from API
  return await api('stories');
}
```

!!! note

    Note that you can only import javascript modules that are within the same module. You cannot import
    files from another module by requiring a file via the parent directory: `require('../other-module/otherHandler');`
    
    
## Stateless vs Stateful

When implementing handlers you should always aim to keep your handlers stateless. That means that each
handler should always return the same result given the same input values and should not
store any data / state in memory: 

```javascript
module.exports = async function(payload, context) {
  // Initialize all your variables INSIDE of the handler function
  const someValue = 1 + 3;
  return someValue;
}
```

As the same process might be reused by the slicknode runtime engine, variables that are initialized 
outside of the handler function would be shared between requests which might result in unexpected
behavior and / or memory leaks when not implemented correctly. 

### Stateful Handlers

In most cases you would want to implement all of the handler logic as a stateless function. One of the
few usecases where a stateful implementation is recommended is when you want to reuse expensive 
resources like database connections across requests and even between different handlers. 

In that case it is recommended to place the initialization logic of the resource in a dedicated file and 
import the module in all handlers that need to use it. 

For example, if you want to connect to a MongoDB database via mongoose, you could have 3 files, one to initialize
a MongoDB connection, one for a model and then import the model into the handler that implements the logic: 

**db.js:**
```javascript
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

module.exports = mongoose;
```

The connection will be established the first time the file is imported and will be loaded from cache 
for all following imports. Therefore only one DB connection will be created per module and running 
container instance while minimizing the resource consumption in the runtime and on your
database server. 

**models/Cat.js:**
```javascript
// We need to require the db file to make sure the DB connection is established
const mongoose = require('../db.js');

const Cat = mongoose.model('Cat', { name: String });
module.exports = Cat;
```

**handlers/myHandler.js:**
```javascript
// Import Cat model
const Cat = require('../models/Cat');

module.exports = async function(payload, context) {
  // Create new cat object
  const kitty = new Cat({ name: 'Zildjian' });
  
  // Save in database
  await kitty.save();
}
```

## Testing + Development workflow

The recommended approach to develop slicknode extensions is to use a Test Driven Development
workflow where you write the test first and implement the logic afterwards. Since every
piece of logic is implemented as a handler, which is just a simple javascript function,
implementing a test is trivial: You write tests that pass a payload and a context
and check if the function returns the correct result or throws the right errors. 

This also has the following major advantages: 

-   **Development Speed:** When you implement your handler with a local test suite, you can avoid
    having to deploy your project to the slicknode servers after each change. While the deployment to
    the slicknode servers is pretty fast, it can still dramatically increase the number of 
    iterations you can make in a given time period, especially when you setup a watcher that 
    automatically reruns your test suite whenever you save a file. 
-   **Code Quality:** Following the TDD approach ensures that you can test the functionality of your custom
    code automatically on your local machine or in a CI pipeline. This results in great code quality 
    and robust extensions that don't break. 
    
You can setup your favorite test runner or framework in the `package.json` file of your module. 
Refer to the instructions of the testing framework that you are using to see how to write tests
for your handlers. 
