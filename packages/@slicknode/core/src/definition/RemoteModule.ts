/**
 * Created by Ivo Meißner on 2019-07-04
 *
 */
export type RemoteModule = {
  /**
   * Remote GraphQL endpoint
   */
  endpoint: string;
  /**
   * HTTP headers to be sent to the endpoint
   */
  headers?: {
    [name: string]: string;
  };

  /**
   * Cache configuration
   */
  cache?: {
    maxAge: number;
  };
};
