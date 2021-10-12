**IMPORTANT:** All functionality in this package should be considered an internal API that is subject to change without notice. Please check out the official [Slicknode Documentation](https://slicknode.com/docs/) to learn how to use the public APIs.

# Slicknode Express Handler

Express handler to serve the Slicknode GraphQL and admin API.

## Usage

```typescript
import express from 'express';
import { createHandler } from './create-handler';

const PORT = 3000;

const app = express();
app.use(
  '/',
  createHandler({
    // Path to your Slicknode project root dir
    dir: './',

    // Automatically apply migrations on start (Can quickly lead to accidental data deletion)
    forceMigrate: true,

    // Database configuration
    database: {
      // Database schema name to use for the project
      schemaName: 'test',

      connection: {
        // PostgreSQL connection URL
        url: 'postgresql://postgres:mysecretpassword@localhost:5432/master',
      },
    },
    // Enable Slicknode console integration
    admin: {
      // Admin secret that is also setup in the Slicknode console (min 20 characters)
      secret: '12345678901234567890',
    },
  })
);
app.listen(PORT, () => {
  console.log(`Server listening on: http://localhost:${PORT}`);
});
```
