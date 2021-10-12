/**
 * Created by Ivo Meißner on 18.06.17.
 *
 */

import Context from '../../context';
import { getConnection } from '../../db';

export default async function destroyTestContext(
  context: Context
): Promise<void> {
  const dbName = context.getDBWrite().client.connectionSettings.database;

  // Prevent accidental deletion of other DBs
  if (!dbName.startsWith('test_')) {
    throw new Error('Only databases with prefix test_ can be deleted');
  }

  // Close current connection
  if (context._dbWrite) {
    await context._dbWrite.destroy();
  }
  if (context._dbRead) {
    await context._dbRead.destroy();
  }

  const conn = getConnection();

  try {
    // Close remaining DB connections
    await conn.raw(`REVOKE CONNECT ON DATABASE ${dbName} FROM public;
      ALTER DATABASE ${dbName} CONNECTION LIMIT 0;
      SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE pid <> pg_backend_pid()
        AND datname='${dbName}';`);
  } catch (e) {
  } finally {
    // Drop database
    await conn.raw(`DROP DATABASE IF EXISTS ${dbName};`);
  }
}
