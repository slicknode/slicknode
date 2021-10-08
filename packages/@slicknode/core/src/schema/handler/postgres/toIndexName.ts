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
 * @param namespace
 */
export default function toIndexName(
  tableName: string,
  fieldNames: Array<string>,
  namespace: string = ''
): string {
  return 'ix_' + namespace + md5Hash(tableName + ':' + fieldNames.join('$'));
}
