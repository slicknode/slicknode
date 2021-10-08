/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

export type EnumValueConfig = {
  /**
   * The internal value that is stored in the database
   */
  value: string | number;
  /**
   * The description of the value
   */
  description?: string | null;
  /**
   * The deprecation reason of the value
   */
  deprecationReason?: string;
};

/**
 * Map of enum values where the key is the value name that is exposed via GraphQL
 */
export type EnumValueConfigMap = {
  [valueName: string]: EnumValueConfig;
};
