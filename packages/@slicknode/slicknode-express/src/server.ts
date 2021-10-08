import express from 'express';
import { createHandler } from './create-handler';
import path from 'path';

const PORT = 3000;

const app = express();
app.use(
  '/',
  createHandler({
    dir: path.resolve(__dirname, './__tests__/test-project'),
    forceMigrate: true,
    database: {
      schemaName: 'test1',
      connection: {
        url: 'postgresql://postgres:mysecretpassword@localhost:5432/master',
      },
    },
    admin: {
      secret: '12345678901234567890',
      rootApiEndpoint: 'https://api.slicknode.com',
    },
    images: {
      secret: 'somesecretxyz1243567890',
      bucket: 'images',
      clientConfig: {
        endpoint: 'http://localhost:9000',
        secretAccessKey: 'fake_secret',
        accessKeyId: 'fake_access',
      },
    },
    projectEndpoint: `http://localhost:${PORT}`,
    watch: true,
  })
);
app.listen(PORT, () => {
  console.log(`Server listening on: http://localhost:${PORT}`);
});
