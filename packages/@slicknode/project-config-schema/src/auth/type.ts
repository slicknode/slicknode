/**
 * Created by Ivo Meißner on 16.11.16.
 *
 */
export enum Role {
  ANONYMOUS = 'ANONYMOUS',
  AUTHENTICATED = 'AUTHENTICATED',
  FULLY_AUTHENTICATED = 'FULLY_AUTHENTICATED',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  RUNTIME = 'RUNTIME'
}

export type Permission = {
  /**
   * The role that is granted a certain permission
   */
  role: Role;
  /**
   * If fields are set, the access is limited to the given
   * set of fields
   */
  fields?: Array<string>;
  /**
   * A GraphQL query that filters the result set. On an ObjectType with a Node interface
   * this can for example be a filter query on the node and on the user
   */
  query?: string;
};
