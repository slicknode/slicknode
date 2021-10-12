import { flags } from '@oclif/command';

export const databaseSchema = flags.string({
  char: 's',
  description: 'The DB schema name where the data is stored',
  env: 'SLICKNODE_DATABASE_SCHEMA',
  default: 'slicknode',
  required: true,
});

export const databaseUrl = flags.string({
  char: 'u',
  description:
    'PostgreSQL DB connection url, for example: postgresql://user:secret@localhost/dbname',
  env: 'SLICKNODE_DATABASE_URL',
  required: true,
});
