import { IndexConfig, ObjectTypeConfig, TypeKind } from '../../../../definition';
import { MigrationAction, MigrationScope } from '../../base';
import toUniqueConstraintName from '../toUniqueConstraintName';
import toIndexName from '../toIndexName';
import _ from 'lodash';
import { getFieldHandler } from '../getFieldHandler';

type IndexConfigMap = { [indexName: string]: IndexConfig };

/**
 * Updates the indexes of the type
 * @param params
 */
export function updateIndexes(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
  tableName: string;
  currentTypeConfig?: ObjectTypeConfig;
}): MigrationAction | void {
  const { scope, typeConfig, tableName, currentTypeConfig } = params;

  const currentType = currentTypeConfig || scope.currentTypes[typeConfig.name];
  const from =
    currentType && currentType.kind === TypeKind.OBJECT
      ? currentType.indexes || []
      : [];
  const to = typeConfig.indexes || [];

  const createIndexConfigMap = (map: IndexConfigMap, config) => {
    const indexName = config.unique
      ? toUniqueConstraintName(tableName, config.fields)
      : toIndexName(tableName, config.fields);
    map[indexName] = config;
    return map;
  };

  const currentIndexes = from.reduce(createIndexConfigMap, {});
  const newIndexes = to.reduce(createIndexConfigMap, {});

  // If we have no changes, return NULL
  if (
    _.xor(Object.keys(currentIndexes), Object.keys(newIndexes)).length === 0
  ) {
    return;
  }

  return {
    preponedAction: async () => {
      // Drop removed indexes
      for (const indexName of Object.keys(currentIndexes)) {
        if (!newIndexes.hasOwnProperty(indexName)) {
          await (scope.config.db.schema.raw as any)('drop index if exists ??', [
            scope.config.schemaName
              ? `${scope.config.schemaName}.${indexName}`
              : indexName,
          ]);
        }
      }
    },
    postponedAction: null,
    action: async () => {
      // Create new indexes
      for (const indexName of Object.keys(newIndexes)) {
        if (!currentIndexes.hasOwnProperty(indexName)) {
          const indexConfig = newIndexes[indexName];
          // Translate fields to column names
          const columnNames = indexConfig.fields.reduce(
            (cols: string[], fieldName) => {
              const fieldConfig = typeConfig.fields[fieldName];
              const fieldHandler = getFieldHandler(fieldConfig, scope);
              return [
                ...cols,
                ...fieldHandler.getColumnNames(fieldName, fieldConfig),
              ];
            },
            []
          );
          await (scope.config.db.schema.raw as any)(
            `create ${
              indexConfig.unique ? 'unique ' : ''
            }index if not exists ?? on ?? (${columnNames
              .map(() => '??')
              .join(', ')})`,
            [indexName, tableName, ...columnNames]
          );
        }
      }
    },
  };
}
