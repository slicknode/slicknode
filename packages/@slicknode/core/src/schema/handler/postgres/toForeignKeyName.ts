/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import { md5Hash } from '../../../utils/string';

/**
 * Returns the foreign key name for the given field
 * @param tableName
 * @param fieldName
 */
export default function toForeignKeyName(
  tableName: string,
  fieldName: string
): string {
  return 'fk_' + md5Hash(tableName + ':' + fieldName);
}
