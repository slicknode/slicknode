# Development Setup

This guide describes how to run Slicknode locally for development and testing purposes.

## Requirements

You need to have a recent version of [Docker](https://docker.com) as well as [NodeJS](https://nodejs.org) installed on your computer to complete this guide.

## Initialize Project

If you are creating a new project from scratch, initialize a new Slicknode project:

    npx slicknode init

## Setup Dependent Services

Slicknode needs at the minimum a PostgreSQL database to run. If you also want to use the `file` or the `image` module, you need an S3 compatible storage server to store the assets. For the local development setup, we will be using docker-compose so we can have a fully local setup that does not require any network connections.

In your project root directory create a new file `docker-compose.yml` and add the following content:

_docker-compose.yml_

```yaml
version: '3.0'

volumes:
  db_data: {}
  file_storage: {}

services:
  # S3 service to store the assets
  s3:
    image: minio/minio
    ports:
      - '9000:9000'
      - '9001:9001'
    command: minio server /export --console-address ":9001"
    environment:
      - MINIO_ACCESS_KEY=fake_access
      - MINIO_SECRET_KEY=fake_secret
    volumes:
      - file_storage:/data

  # PostgreSQL database service
  postgres:
    image: postgres
    ports:
      - '5432:5432'
    volumes:
      - db_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=mysecretpassword
      - POSTGRES_USER=postgres
      - POSTGRES_DB=master

  # Service to initialize the storage buckets in the S3 service
  s3_init:
    image: minio/mc:latest
    depends_on:
      - s3
    entrypoint: >
      /bin/sh -c "
      sleep 5 &&
      mc alias set minio http://s3:9000 fake_access fake_secret --api S3v4 &&
      mc mb minio/upload || true &&
      mc mb minio/publicupload || true &&
      mc mb minio/image || true &&
      mc anonymous set download minio/publicupload || true &&
      mc anonymous set download minio/image || true &&
      exit 0
      "
```

To start the database and asset services, launch the docker containers:

    docker-compose up

## Environment Variables

We can set environment variables to configure the service endpoints, ports and credentials for Slicknode. The environment variables can also be configured via a `.env` file.

Create a file `.env` in your project root directory and add the following content.

_.env_

```ini
# Database configuration
SLICKNODE_DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/master

SLICKNODE_PORT=3000

# Image handler configuration
SLICKNODE_S3_IMAGE_ENDPOINT=http://localhost:9000
SLICKNODE_S3_IMAGE_ENDPOINT_CDN=http://localhost:3000/images
SLICKNODE_S3_IMAGE_BUCKET=image
SLICKNODE_IMAGE_THUMBNAIL_SECRET=12345678901234567890

SLICKNODE_S3_AWS_ACCESS_KEY_ID=fake_access
SLICKNODE_S3_AWS_SECRET_ACCESS_KEY=fake_secret
```

For a full list of environment variables that can be used to configure Slicknode, see the docs of the [slicknode start](../cli/start.md) command.

!!! info

    The credentials and hosts need to match the settings in the `docker-compose.yml` file and the exmaple values assume that Docker binds your containers to your localhost network interface. If you changed the credentials or if your docker containers are bound to another host, adjust the values accordingly.

## Setup Scripts

If your project does not have a `package.json` file yet, initialize the package:

    npm init -y

Then add `slicknode` as a dependency to the project so that you can manage the version of Slicknode independently of the Slicknode version you are using globally on your computer:

    npm install slicknode

Now we can add a few scripts to your `package.json` file:

_package.json_

```javascript
{
  "scripts": {
    "start": "slicknode start",
    "migrate": "slicknode migrate",
    "dev": "slicknode start --watch --force-migrate"
    //...
  },
  "dependencies": {
    "slicknode": "^0.13.0"
    //...
  }
  //...
}
```

### dev

Start Slicknode in development mode:

    npm run dev

It automatically watches for schema and code changes and updates the GraphQL API automatically without restart.

!!! warning

    The `--force-migrate` option applies the migrations automatically without warning, including deleting tables etc. This is great for fast development, but not recommended to run with a database that has any valuable data in it. If you want to review all migrations before they are applied to the database, remove the flag and execute the `npm run migrate` script manually.

### migrate

Apply the database migrations with all pending schema changes:

    npm run migrate

This will show you the pending database migrations and ask for your confirmation. If you want to apply the migrations directly without confirmation, for example in a CI environment, add the `--force` flag:

    npm run migrate -- --force

### start

Start the Slicknode GraphQL API in production mode:

    npm run start
