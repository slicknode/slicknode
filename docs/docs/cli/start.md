# slicknode start

Starts the Slicknode GraphQL API and serves HTTP requests.

## Requirements

- **PostgreSQL:** You need to have a running [PostgreSQL](https://www.postgresql.org/) database server that can be accessed from the computer that runs the Slicknode GraphQL API. Check out the [PostgreSQL Documentation](https://www.postgresql.org/download/) to learn how to setup PostgreSQL for your operating system.
- **S3 File Storage:** If you need asset storage in your project, for example for the `image` or `file` module, you need to add the storage bucket configuration.
  Slicknode uses S3 (or an S3 compatible storage) for object storage. You can either configure credentials for an AWS S3 bucket that is hosted in the cloud, or use something like [Minio](https://min.io/) if you want to host the files yourself or locally.

## Usage

To start the Slicknode GraphQL API in production mode on port 3000 for example, run the following command:

```bash
slicknode start -p 3000 --database-url postgresql://user:secret@localhost/dbname
```

Adjust the credentials in the database URL to point to your PostgreSQL server.

For development, you can start the server in watch mode by adding the `--watch` (or `-w`) option. This automatically reloads all code and schema files and updates the GraphQL API without restarting the server.

```bash
slicknode start -p 3000 --database-url postgresql://user:secret@localhost/dbname --watch
```

If you want to automatically apply database migrations as soon as any schema file in your system is saved, you can add the option `--force-migrate`. This allows you to quickly iterate on your schema.
**Important:** Only use this during development as all database migrations will be applied immediately without warning. Deleting a field or type will remove all data irreversibly.

```bash
slicknode start -p 3000 --database-url postgresql://user:secret@localhost/dbname --watch --force-migrate
```

## Configuration

The server can be configured and customized in several ways. The configuration options are evaluated in the following order:

1.  **Command Arguments:** Configuration options passed as command arguments have the highest priority. You can pass them to the `slicknode start` command:

```bash
slicknode start --option-name value
```

2.  **Environment Variables:** You can configure Slicknode options via environment variables.

    Example for setting them explicitly in the terminal:

    ```bash
    export SLICKNODE_OPTION_NAME=value
    slicknode start
    ```

    Using environment variables is the recommended way to pass configuration to Slicknode that is running in a docker container for example.

3.  **.env File:** Options can also be configured in a `.env` file that needs to be placed in the root directory of the project:

    ```
    SLICKNODE_OPTION_NAME1=value1
    SLICKNODE_OPTION_NAME2=value2
    ```

    Make sure you don't commit this file to your git repository if it contains sensitive credentials.

### Configuration Options

This is a list of all available configuration options and their corresponding environment variable names:

| Option                      | Env Variable                            | Default     | Description                                                                                                                                                                                                               |     |
| --------------------------- | --------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `--database-url`<br>`-u`    | `SLICKNODE_DATABASE_URL`                |             | PostgreSQL DB connection url, for example:<br> `postgresql://user:secret@localhost:5432/dbname`<br><br>See [the PostgreSQL docs](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING) for details |
| `--database-schema`<br>`-s` | `SLICKNODE_DATABASE_SCHEMA`             | `slicknode` | The database schema in which the project data is stored                                                                                                                                                                   |
| `--dir`<br>`-d`             | -                                       | `./`        | Path to the directory that contains the Slicknode project configuration.                                                                                                                                                  |     |
| `--port`<br>`-p`            | `SLICKNODE_PORT`                        | `3000`      | The network port on which the server listens for HTTP requests                                                                                                                                                            |
| `--force-migrate`<br>`-f`   |                                         | `false`     | Automatically apply DB migrations on start. <br>**WARNING:** Applies migrations immediately when watch mode is on, which can lead to accidental data loss.                                                                |
| `--watch`<br>`-w`           |                                         | `false`     | Watch for filesystem changes and automatically reload handler code, GraphQL schema etc.                                                                                                                                   |
| `--admin-secret`            | `SLICKNODE_ADMIN_SECRET`                |             | Admin secret to connect the Slicknode project to the Slicknode console. (min 20 characters)                                                                                                                               |
| `--s3-image-endpoint`       | `SLICKNODE_S3_IMAGE_ENDPOINT`           |             | The S3 service endpoint for the image bucket, for example: `https://s3.us-west-1.amazonaws.com`                                                                                                                           |
| `--s3-image-endpoint-cdn`   | `SLICKNODE_S3_IMAGE_ENDPOINT_CDN`       |             | Public endpoint for the images. If no CDN is used, should point to `http(s)://<your-slicknode-endpoint>/images/`                                                                                                          |
| `--s3-image-bucket`         | `SLICKNODE_S3_IMAGE_BUCKET`             |             | S3 bucket where images are stored                                                                                                                                                                                         |
| `--image-thumbnail-secret`  | `SLICKNODE_IMAGE_THUMBNAIL_SECRET`      |             | Secret to generate unguessable URLs to image thumbnails                                                                                                                                                                   |
| `--s3-access-key-id`        | `SLICKNODE_S3_AWS_ACCESS_KEY_ID`        |             | AWS access key ID for S3 storage                                                                                                                                                                                          |
| `--s3-secret-access-key`    | `SLICKNODE_S3_AWS_SECRET_ACCESS_KEY`    |             | AWS secret access key for S3 storagestorage                                                                                                                                                                               |
|                             | `SLICKNODE_CONNECTION_NODES_MAX`        | `100`       | Maximum number of nodes that can be returned in a relay connection                                                                                                                                                        |
|                             | `SLICKNODE_CONNECTION_NODES_DEFAULT`    | `10`        | Number of nodes that is being returned in relay connections if no limit is provided                                                                                                                                       |
|                             | `SLICKNODE_S3_FILE_PRIVATE_BUCKET`      |             | Storage bucket name for private files                                                                                                                                                                                     |
|                             | `SLICKNODE_S3_FILE_PRIVATE_ENDPOINT`    |             | The S3 service endpoint for the file bucket, for example: `https://s3.us-west-1.amazonaws.com`                                                                                                                            |
|                             | `SLICKNODE_S3_FILE_PUBLIC_BUCKET`       |             | Storage bucket name for public files                                                                                                                                                                                      |
|                             | `SLICKNODE_S3_FILE_PUBLIC_ENDPOINT`     |             | The S3 service endpoint for the bucket of public files, for example: `https://s3.us-west-1.amazonaws.com`                                                                                                                 |
|                             | `SLICKNODE_S3_FILE_PUBLIC_ENDPOINT_CDN` |             | The CDN URL where the public files are accessible                                                                                                                                                                         |
|                             | `SLICKNODE_MAX_QUERY_COMPLEXITY`        | `1000`      | Maximum number of nodes that can be returned in one request                                                                                                                                                               |
