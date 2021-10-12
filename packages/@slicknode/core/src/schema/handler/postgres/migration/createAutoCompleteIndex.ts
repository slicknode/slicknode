import { ObjectTypeConfig } from '../../../../definition';
import { MigrationScope } from '../../base';
import toColumnName from '../toColumnName';
import toIndexName from '../toIndexName';
import { AUTO_COMPLETE_INDEX_NAMESPACE } from '../constants';
import { getAutoCompleteQueryField } from '../getAutoCompleteQueryField';

/**
 * Creates the autocomplete index for the given type configuration type
 *
 * @param params
 */
export async function createAutoCompleteIndex(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
  tableName: string;
}): Promise<any> {
  const { tableName, typeConfig, scope } = params;
  if (
    typeConfig.autoCompleteFields &&
    typeConfig.autoCompleteFields.length > 0
  ) {
    const columnNames = (typeConfig.autoCompleteFields || []).map((name) =>
      toColumnName(name)
    );

    return await (scope.config.db.schema.raw as any)(
      `create index ?? on ?? using gist (
        (${getAutoCompleteQueryField(columnNames)}) gist_trgm_ops
      )`,
      [
        toIndexName(tableName, columnNames, AUTO_COMPLETE_INDEX_NAMESPACE),
        tableName,
        ...columnNames,
      ]
    );
  }
}
