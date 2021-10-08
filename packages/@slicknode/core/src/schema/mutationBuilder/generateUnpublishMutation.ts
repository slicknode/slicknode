import {
  FieldConfigMap,
  isContent,
  MutationConfig,
  ObjectTypeConfig,
} from '../../definition';
import { getMutationName } from '../identifiers';
import Context from '../../context';
import { getHandler } from '../handler';
import _ from 'lodash';
import { getSurrogateKeys } from '../../cache/surrogate/utils';
import { ComplexityEstimator } from 'graphql-query-complexity';

/**
 * Generates the MutationConfig to unpublish a node of the type
 * @param typeConfig
 */
export function generateUnpublishMutation(
  typeConfig: ObjectTypeConfig
): MutationConfig {
  if (!typeConfig.handler) {
    throw new Error('No handler configured for type ' + typeConfig.name);
  }

  const name = getMutationName(typeConfig.name, 'UNPUBLISH');
  const isContentNode = isContent(typeConfig);
  if (!isContentNode) {
    throw new Error(
      'Unpublish mutation can only be generated for Content nodes'
    );
  }

  const inputFields: FieldConfigMap = {
    ids: {
      typeName: 'ID',
      description: `The ID of the ${typeConfig.name} to be unpublished`,
      list: [true],
      validators: [
        {
          type: 'gid',
          config: {
            types: [typeConfig.name],
          },
        },
      ],
      required: true,
    },
  };

  return {
    name,
    description: `Unpublishes nodes of type ${typeConfig.name} with the provided IDs`,
    inputFields,
    fields: {
      nodes: {
        typeName: typeConfig.name,
        description: 'List of unpublished nodes',
        required: true,
        list: [true],
      },
    },
    complexity,
    mutate: async (
      input: {
        [x: string]: any;
      },
      context: Context
    ) => {
      const handler = getHandler(typeConfig.handler);
      const ids = input.ids.map((id: string) => context.fromGlobalId(id).id);

      // Check permissions
      const permissions = (typeConfig.mutations || {}).unpublish || [];

      const nodes = await context.transaction(async (trxContext) => {
        // Unpublish nodes
        return await handler.unpublish({
          typeConfig,
          ids,
          context: trxContext,
          permissions,
        });
      });

      // Invalidate node cache if configured
      if (context.surrogateCache) {
        const purgedKeys: string[] = nodes.reduce((keys, node) => {
          const previewKeys = getSurrogateKeys({
            typeConfig,
            node,
            preview: true,
          });
          const publishedKeys = getSurrogateKeys({
            typeConfig,
            node,
            preview: true,
          });
          keys.push(previewKeys.key);
          keys.push(previewKeys.fallbackKey);
          keys.push(publishedKeys.key);
          keys.push(publishedKeys.fallbackKey);
          return keys;
        }, []);

        await context.surrogateCache.purge(purgedKeys);
      }

      return {
        nodes,
      };
    },
    permissions: (typeConfig.mutations && typeConfig.mutations.unpublish) || [],
  };
}

const complexity: ComplexityEstimator = ({ args, childComplexity }) => {
  return (args.input?.ids?.length || 1) * (childComplexity || 1) + 10;
};
