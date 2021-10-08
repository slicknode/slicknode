/**
 * Created by Ivo Meißner on 19.04.17.
 *
 */

export type FieldAdminConfig = {
  /**
   * The label that is displayed for the fields in forms, lists etc.
   */
  label: string;
  /**
   * Description of the field
   */
  description: string | undefined | null;
};

export interface FieldAdminConfigMap {
  [name: string]: FieldAdminConfig;
}
