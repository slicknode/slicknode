/**
 * Created by Ivo Meißner on 16.11.16.
 *
 */
export enum Role {
  ANONYMOUS = 0,
  AUTHENTICATED = 1,
  FULLY_AUTHENTICATED = 2,
  ADMIN = 3,
  STAFF = 4,
  RUNTIME = 100,
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

export type OperationType =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'PUBLISH'
  | 'UNPUBLISH';

export type AuthContext = {
  /**
   * The user ID of the logged in user, NULL if user is anonymous
   */
  uid: string | undefined | null;
  /**
   * An array of roles that the user has
   */
  roles: Array<Role>;
  /**
   * True if the current auth context has write access
   * The token that is passed via cookie can only have read access to prevent CSRF attacks
   */
  write: boolean;
};
