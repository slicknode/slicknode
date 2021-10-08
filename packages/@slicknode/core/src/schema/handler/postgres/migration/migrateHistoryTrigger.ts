import { ObjectTypeConfig } from '../../../../definition';
import {
  combineMigrationActions,
  MigrationAction,
  MigrationScope,
} from '../../base';
import toTableName, { TableType } from '../toTableName';
import { getFieldHandler } from '../getFieldHandler';

// Maximum number of history entries to keep
// @TODO: Make dynamic somehow
const HISTORY_LIMIT = 10;

/**
 * Creates the trigger for the history table of content nodes
 *
 * @param params
 */
export function createHistoryTrigger(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
}): MigrationAction {
  const { scope, typeConfig } = params;
  const action = updateHistoryTrigger({ scope, typeConfig });
  return combineMigrationActions([
    action,
    {
      async action() {
        const db = scope.config.db;
        const schemaName = scope.config.schemaName || 'public';
        const tableName = toTableName(typeConfig, null, TableType.PREVIEW);
        const historyTableName = toTableName(
          typeConfig,
          null,
          TableType.HISTORY
        );
        await db.raw(
          `
create trigger ??
after update or delete on ??.??
for each row execute procedure ??.??();
`,
          [tableName, schemaName, tableName, schemaName, historyTableName]
        );
      },
      postponedAction: null,
      preponedAction: null,
    },
  ]);
}

/**
 * Updates the history trigger for a content node
 * @param params
 */
export function updateHistoryTrigger(params: {
  typeConfig: ObjectTypeConfig;
  scope: MigrationScope;
}): MigrationAction {
  const { scope, typeConfig } = params;
  return {
    async action() {
      const db = scope.config.db;
      const schemaName = scope.config.schemaName || 'public';
      const historyTable = toTableName(typeConfig, null, TableType.HISTORY);
      const columns: string[] = Object.keys(typeConfig.fields).reduce(
        (columns: string[], fieldName) => {
          // Ignore ID field, history node has dedicated table and ID series, reference is done via contentNode
          if (fieldName === 'id') {
            return columns;
          }

          const fieldConfig = typeConfig.fields[fieldName];
          const fieldHandler = getFieldHandler(fieldConfig, scope);
          return [
            ...columns,
            ...fieldHandler.getColumnNames(fieldName, fieldConfig),
          ];
        },
        []
      );
      await db.raw(
        `
create or replace function ??.??() returns trigger as $body$
begin
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    insert into ?? (
       ${columns.map(() => '??').join(', ')}
    ) values (
       ${columns.map(() => 'OLD.??').join(', ')}
    );
    delete from ?? where ctid IN (
      select ctid
      from ??
      where "locale" = OLD."locale"
      and "content_node" = OLD."content_node"
      order by id DESC
      offset ${HISTORY_LIMIT}
    );
    return NEW;
  end if;
end;
$body$
language plpgsql
security definer
set search_path = pg_catalog, ??;
`,
        [
          schemaName,
          historyTable,
          historyTable,
          ...columns,
          ...columns,
          historyTable,
          historyTable,
          schemaName,
        ]
      );
    },
    postponedAction: null,
    preponedAction: null,
  };
}

/**
 * Deletes history trigger and function
 *
 * @param params
 */
export function deleteHistoryTrigger(params: {
  scope: MigrationScope;
  typeConfig: ObjectTypeConfig;
}) {
  const { scope, typeConfig } = params;
  return {
    async action() {
      const db = scope.config.db;
      const schemaName = scope.config.schemaName || 'public';
      const historyTable = toTableName(typeConfig, null, TableType.HISTORY);
      await db.raw('drop function if exists ??.??', [schemaName, historyTable]);
    },
  };
}
