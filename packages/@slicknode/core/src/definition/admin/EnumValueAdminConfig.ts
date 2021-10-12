/**
 * Created by Ivo Meißner on 22.04.17.
 *
 */

export type EnumValueAdminConfig = {
  /**
   * The GraphQL enum value. This is the external string representation, not the internal value
   */
  value: string;
  /**
   * The hum readable label that is displayed in the backend
   */
  label: string;
  /**
   * A description that is displayed in the backend
   */
  description?: string;
  /**
   * Deprecation reason for the type
   */
  deprecationReason?: string;
};
