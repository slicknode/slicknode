/**
 * Checks the node limit for the provided type
 * @param params
 */
import { isContent, ObjectTypeConfig } from '../../../definition';
import { Context } from '../../../context';
import toTableName, { TableType } from './toTableName';
import { RECORD_LIMIT_NODE_MAX, RECORD_LIMIT_TOTAL } from '../../../config';

/**
 * Enorces the record limit
 * @param params
 */
export async function checkRecordLimit(params: {
  typeConfig: ObjectTypeConfig;
  context: Context;
  totalMax?: number;
  totalNodes?: number;
}) {
  const { context, typeConfig, totalMax, totalNodes } = params;

  // Get limits
  const maxTotal = totalMax || RECORD_LIMIT_TOTAL || Infinity;
  const maxNodes =
    totalNodes ||
    RECORD_LIMIT_NODE_MAX.split(',').reduce((max, pair) => {
      const [typeName, limit] = pair.split(':');
      if (typeName === typeConfig.name) {
        return parseInt(limit, 10);
      }
      return max;
    }, Infinity);

  // Return if no limits set
  if (maxTotal === Infinity && maxNodes === Infinity) {
    return {
      totalRemaining: Infinity,
      totalCount: null,
      nodesRemaining: Infinity,
      nodesCount: null,
    };
  }

  const db = context.getDBRead();
  const schemaName = context.getDBSchemaName();

  const result = await db.raw(
    `
    with counts as (
      select 
        relname, n_live_tup
      from pg_stat_user_tables 
      where 
        schemaname = ?
    )
    select * from (
      select sum(n_live_tup) as total from counts as c1
      where (
        relname LIKE 'p_%' OR (
        relname LIKE 'n_%' and not exists (select 1 from counts as c where concat('p', substring(c1.relname from 2)) = c.relname)
        )
      )
      and (
        relname not in ('n_content_node', 'n_refresh_token')
      )
    ) as t,
    (
      select count(*) as nodes from ??
    ) as n
  `,
    [
      context.getDBSchemaName() || 'public',
      toTableName(
        typeConfig,
        schemaName,
        isContent(typeConfig) ? TableType.PREVIEW : TableType.DEFAULT
      ),
    ]
  );
  if (!result.rows.length) {
    throw new Error('Could not load record limits');
  }
  const counts = result.rows[0];

  const totalCount = parseInt(counts.total, 10);
  const nodesCount = parseInt(counts.nodes, 10);

  return {
    totalRemaining: maxTotal - totalCount,
    totalCount,
    nodesRemaining: maxNodes - nodesCount,
    nodesCount,
  };
}
