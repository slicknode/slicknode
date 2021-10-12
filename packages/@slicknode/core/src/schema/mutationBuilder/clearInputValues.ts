import {
  FieldConfig,
  isContent,
  isContentUnion,
  isNode,
  ObjectTypeConfig,
} from '../../definition';
import Context from '../../context';
import _ from 'lodash';
import { fileTokenToId } from '../../modules/file/utils';
import { GraphQLObjectType, GraphQLUnionType } from 'graphql';
import toTableName, { TableType } from '../handler/postgres/toTableName';
import toColumnName from '../handler/postgres/toColumnName';
import { getPgTypeName } from '../handler/postgres/fields/IDHandler';

/**
 * Transforms the input values to a format that can be sent to the handler
 * Converts global IDs to local ones
 *
 * @param input
 * @param typeConfig
 * @param context
 */
export function cleanInputValues(
  input: {
    [x: string]: any;
  },
  typeConfig: ObjectTypeConfig,
  context: Context
): {
  [x: string]: any;
} {
  return _.mapValues(input, (val: any, fieldName: string) => {
    if (
      val &&
      typeConfig.fields.hasOwnProperty(fieldName) &&
      typeConfig.fields[fieldName]
    ) {
      const fieldConfig = typeConfig.fields[fieldName];
      const typeName = fieldConfig.typeName;

      // For files we validate and convert the token to internal ID
      if (typeName === 'File') {
        return fileTokenToId(val, context);
      }

      // Locale
      if (fieldName === 'locale' && isContent(typeConfig)) {
        return val;
      }

      // Get related field type config
      const fieldTypeConfig =
        context.schemaBuilder.typeConfigs[fieldConfig.typeName];

      // Node object types get a global ID as input value
      if (fieldTypeConfig && isNode(fieldTypeConfig)) {
        if (isContent(fieldTypeConfig)) {
          return prepareContentIds({
            value: val,
            fieldConfig,
            context,
            validTypeNames: [fieldTypeConfig.name],
          });
        } else {
          return context.fromGlobalId(val).id;
        }
      } else if (
        fieldTypeConfig &&
        isContentUnion(fieldTypeConfig, context.schemaBuilder.typeConfigs)
      ) {
        return prepareContentIds({
          value: val,
          fieldConfig,
          context,
          validTypeNames: fieldTypeConfig.typeNames,
        });
      }
    }

    return val;
  });
}

/**
 * Prepares IDs of content node fields, returns DB subselect to validate IDs
 * @param params
 */
function prepareContentIds(params: {
  value: any;
  context: Context;
  fieldConfig: FieldConfig;
  validTypeNames: string[];
}) {
  const { context, value, fieldConfig, validTypeNames } = params;
  // If we have content, translate ID to internal ContentNode ID via subselect
  const contentNodeTable = toTableName(
    context.schemaBuilder.getObjectTypeConfig('ContentNode'),
    context.getDBSchemaName()
  );
  const db = context.getDBWrite();
  if (fieldConfig.list) {
    // Translate IDs to ContentNode IDs via subquery, preserving order
    const ids = value.map((v) => context.fromGlobalId(v).id);
    if (!ids.length) {
      return db.raw("select '{}'::uuid[]");
    }
    return db.raw(
      '(select array_agg(??) from (' +
        'select ?? from ' +
        `unnest(array[${ids.map(() => `?::uuid`).join(', ')}]) ` +
        'with ordinality as r(val, rn) ' +
        `inner join ?? on val = ?? where ?? in (${validTypeNames
          .map(() => '?')
          .join(', ')}) order by rn` +
        ') t)',
      [
        toColumnName('id'),
        toColumnName('id'),
        ...ids,
        contentNodeTable,
        `${contentNodeTable}.${toColumnName('id')}`,
        `${contentNodeTable}.${toColumnName('type')}`,
        ...validTypeNames,
      ]
    );
  } else {
    return (
      db
        .select(toColumnName('id'))
        .from(contentNodeTable)
        .whereRaw(`?? = ?::uuid`, [
          toColumnName('id'),
          context.fromGlobalId(value).id,
        ])
        // Ensure ContentNode is of right type
        .whereIn(toColumnName('type'), validTypeNames)
    );
  }
}
