import { ObjectTypeConfig } from '../../../../definition';
import { MigrationScope } from '../../base';
import toColumnName from '../toColumnName';
import toIndexName from '../toIndexName';
import { AUTO_COMPLETE_INDEX_NAMESPACE } from '../constants';

/**
 * Deletes the autocomplete index for the given type configuration
 * @param params
 */
export async function deleteAutoCompleteIndex(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
  tableName: string;
}): Promise<any> {
  const { typeConfig, scope, tableName } = params;

  if (
    typeConfig.autoCompleteFields &&
    typeConfig.autoCompleteFields.length > 0
  ) {
    const columnNames = (typeConfig.autoCompleteFields || []).map((name) =>
      toColumnName(name)
    );

    return await (scope.config.db.schema.raw as any)('drop index ??', [
      toIndexName(tableName, columnNames, AUTO_COMPLETE_INDEX_NAMESPACE),
    ]);
  }
}
