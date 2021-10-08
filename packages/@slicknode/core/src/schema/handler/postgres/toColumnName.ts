/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import _ from 'lodash';

/**
 * Converts the
 * @param fieldName
 */
export default function toColumnName(fieldName: string): string {
  const columnName = fieldName.split('_').map(_.snakeCase).join('__');
  if (columnName.length > 63) {
    throw new Error('Column name has too many characters');
  }
  return columnName;
}
