/**
 * Configuration of a database table index
 */
export type IndexConfig = {
  /**
   * The fields of the index
   */
  fields: string[];

  /**
   * True if the index is unique
   */
  unique?: boolean;
};
