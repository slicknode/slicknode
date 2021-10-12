/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import _ from 'lodash';

import { ObjectTypeConfig } from '../../../definition';

export enum TableType {
  DEFAULT,
  PREVIEW,
  HISTORY,
}

/**
 * Converts the type name to the PostgreSQL table name
 * @param typeConfig
 * @param schemaName
 * @param tableType - True if draft table should be returned
 */
// eslint-disable-next-line
export default function toTableName(
  typeConfig: ObjectTypeConfig,
  schemaName?: string | undefined | null,
  tableType?: TableType
): string {
  // Custom table name is defined
  let tableName;
  if (typeConfig.tableName) {
    tableName = typeConfig.tableName;
  } else {
    // No table name specified, generate from type
    let prefix = 'n_';
    if (tableType === TableType.PREVIEW) {
      prefix = 'p_';
    } else if (tableType === TableType.HISTORY) {
      prefix = 'h_';
    }

    tableName = prefix + typeConfig.name.split('_').map(_.snakeCase).join('__');
  }
  if (tableName.length > 63) {
    throw new Error('Table name has too many characters');
  }

  return (schemaName ? schemaName + '.' : '') + tableName;
}
