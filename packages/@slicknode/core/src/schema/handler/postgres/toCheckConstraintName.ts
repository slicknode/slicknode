/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import { md5Hash } from '../../../utils/string';

/**
 * Returns a hashed name of the column that can be used
 * to avoid too long identifiers, which will automatically be truncated
 * by postgresql
 *
 * @param tableName
 * @param fieldNames
 */
export default function toCheckConstraintName(
  tableName: string,
  fieldNames: Array<string>
): string {
  return 'check_' + md5Hash(tableName + ':' + fieldNames.join('$'));
}
