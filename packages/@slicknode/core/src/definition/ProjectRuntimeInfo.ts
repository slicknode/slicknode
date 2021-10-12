/**
 * Created by Ivo Meißner on 10.05.17.
 *
 */

export type ProjectRuntimeInfo = {
  /**
   * The ID of the project
   */
  id: number | string;
  /**
   * The unique alias for project (used in API URLs)
   */
  alias: string;
  /**
   * Status of the project as defined in ProjectStatus.STATUS_*
   */
  status: string;
  /**
   * The current project version
   */
  version: {
    /**
     * The ID of the version
     */
    id: number;
    /**
     * The configuration ID
     */
    configuration: string;
  };
  /**
   * Information to which DB to connect to. This only contains the DB names (aliases), the actual
   * connection is done in pgbouncer on the same machine
   */
  rdbmsDatabase: {
    /**
     * The name of the database
     */
    dbWrite: string;
    /**
     * An array of read replica servers. If no dbRead replicas are set,
     * the dbWrite is returned for read queries
     */
    dbRead?: Array<string>;
  };
};
