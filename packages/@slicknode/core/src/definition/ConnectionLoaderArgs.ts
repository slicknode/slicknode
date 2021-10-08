/**
 * Created by Ivo Meißner on 13.04.17.
 *
 */

/**
 * The args that are passed to the Connection DataLoader instance
 */
export type ConnectionLoaderArgs = {
  /**
   * The value of the keyField on the source node. See ConnectionConfig for more info
   */
  sourceKeyValue: any;
  /**
   * The input arguments on the field
   */
  args: {
    [x: string]: any;
  };
};
