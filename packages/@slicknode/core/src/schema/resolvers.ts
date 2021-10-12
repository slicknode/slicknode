import {
  GraphQLTypeResolver,
  GraphQLFieldResolver,
  GraphQLResolveInfo,
} from 'graphql';
import Context from '../context';
import { isContent, isContentUnion, isNode } from '../definition';
import _ from 'lodash';
import { getContentContext } from './utils';

/**
 * Returns the type for the given object, is used as the default resolveType function
 * for union / interface types.
 * @param obj
 */
export const defaultTypeResolver: GraphQLTypeResolver<any, any> = (obj) => {
  if (obj) {
    if (obj.hasOwnProperty('__typename')) {
      return obj.__typename;
    }
  }

  return null;
};

export function createResolver(params: {
  typeName: string;
}): GraphQLFieldResolver<any, Context> {
  const { typeName } = params;
  return async (
    source: {
      [x: string]: any;
    },
    resolveArgs: {
      [x: string]: any;
    },
    context: Context,
    info: GraphQLResolveInfo
  ) => {
    const fieldName = info.fieldName;
    if (source.hasOwnProperty(fieldName)) {
      let val = source[fieldName];
      if (typeof val === 'number') {
        val = String(val);
      }
      const fieldTypeConfig = context.schemaBuilder.typeConfigs[typeName];
      if (typeof val === 'string') {
        const { preview, locale } = getContentContext({
          context,
          args: resolveArgs,
          info,
        });
        return await context
          .getLoader(
            typeName,
            isContent(fieldTypeConfig) ? 'contentNode' : 'id',
            preview,
            locale
          )
          .load(val);
      }

      if (
        fieldTypeConfig &&
        _.isArray(val) &&
        (isNode(fieldTypeConfig) ||
          isContentUnion(fieldTypeConfig, context.schemaBuilder.typeConfigs))
      ) {
        if (!val.length || typeof val[0] !== 'string') {
          return val;
        }
        const { preview, locale } = getContentContext({
          context,
          args: resolveArgs,
          info,
        });

        return (
          await context
            .getLoader(
              typeName,
              isContent(fieldTypeConfig) ? 'contentNode' : 'id',
              preview,
              locale
            )
            .loadMany(val)
        ).filter((n) => n);
      }

      return val;
    }
    return null;
  };
}
