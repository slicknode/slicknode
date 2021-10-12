/**
 * Data fixture for importing data
 */
export type DataFixture = {
  /**
   * The type name that the data is associated with
   */
  type: string;

  /**
   * The data stored in internal data format, will be processed with upsert
   */
  data: { [field: string]: any };
};
