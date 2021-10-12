# slicknode migrate

The slicknode migrate command compares the Slicknode project configuration in the working directory with the state of the database and displays all detected changes. It then performs all required migrations to brint the database into a state that matches the current configuration.

If the database schema does not exist, all database tables for storing system information and the data tables will be created.

## Examples

```bash
# Start migration in interactive mode (for development)
slicknode migrate --database-url postgresql://user:secret@localhost:5432/dbname

# Apply migration to a specific schema in the database (for multi tenancy, test / staging etc.)
slicknode migrate --database-schema customer1 --database-url postgresql://user:secret@localhost:5432/dbname

# Perform migrations without confirmation (for CI etc.)
slicknode migrate --force --database-url postgresql://user:secret@localhost:5432/dbname
```

The configuration options can also be set as environment variables.

### Configuration Options

This is a list of all available configuration options and their corresponding environment variable names:

| Option                      | Env Variable                | Default     | Description                                                                                                                                                                                                               |     |
| --------------------------- | --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `--database-url`<br>`-u`    | `SLICKNODE_DATABASE_URL`    |             | PostgreSQL DB connection url, for example:<br> `postgresql://user:secret@localhost:5432/dbname`<br><br>See [the PostgreSQL docs](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING) for details |
| `--database-schema`<br>`-s` | `SLICKNODE_DATABASE_SCHEMA` | `slicknode` | The database schema in which the project data is stored                                                                                                                                                                   |
| `--dir`<br>`-d`             |                             | `./`        | Path to the directory that contains the Slicknode project configuration.                                                                                                                                                  |     |
| `--force`<br>`-f`           |                             | `false`     | Automatically apply DB migrations on start. <br>**WARNING:** Applies migrations immediately when watch mode is on, which can lead to accidental data loss.                                                                |
