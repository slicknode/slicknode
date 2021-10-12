export interface AdminApiOptions {
  /**
   * The admin API secret that is used to secure the connection between the Slicknode
   * console and the project.
   * The same secret needs to be setup in the Slicknode console.
   */
  secret: string;

  /**
   * The API endpoint of the Slicknode root API, defaults to https://api.slicknode.com
   */
  rootApiEndpoint?: string;
}
