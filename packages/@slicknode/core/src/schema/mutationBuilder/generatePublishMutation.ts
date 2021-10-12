import {
  FieldConfigMap,
  isContent,
  MutationConfig,
  ObjectTypeConfig,
} from '../../definition';
import SchemaBuilder from '../builder';
import { getHandler } from '../handler';
import _ from 'lodash';
import { getMutationName } from '../identifiers';
import Context from '../../context';
import { queryFilteringRequired } from '../../auth/utils';
import { AccessDeniedError } from '../../errors';
import { FieldStorageType } from '../../definition/FieldStorageType';
import { GraphQLResolveInfo } from 'graphql';
import { getSurrogateKeys } from '../../cache/surrogate/utils';
import { ComplexityEstimator } from 'graphql-query-complexity';

/**
 * Generates the MutationConfig to public objects of the type
 * @param typeConfig
 * @param schemaBuilder
 */
export function generatePublishMutation(
  typeConfig: ObjectTypeConfig,
  schemaBuilder: SchemaBuilder
): MutationConfig {
  if (!typeConfig.handler) {
    throw new Error('No handler configured for type ' + typeConfig.name);
  }
  const handler = getHandler(typeConfig.handler);

  // Assemble input fields and convert related objects to ID field
  const inputFields: FieldConfigMap = {};
  const isContentNode = isContent(typeConfig);
  if (!isContentNode) {
    throw new Error('Can only generate publish mutation for Content nodes');
  }

  inputFields.ids = {
    typeName: 'ID',
    list: [true],
    required: true,
    description: 'An array of IDs for the nodes to publish',
    validators: [
      {
        type: 'gid',
        config: {
          types: [typeConfig.name],
          idType:
            typeConfig.fields.id.storageType === FieldStorageType.UUID
              ? 'uuid'
              : 'int',
        },
      },
    ],
  };

  inputFields.status = {
    typeName: 'String',
    required: true,
    description: 'The name of the status to publish to',
  };

  const name = getMutationName(typeConfig.name, 'PUBLISH');

  return {
    name,
    description: `Publishes nodes of type ${typeConfig.name} to different statuses`,
    inputFields,
    fields: {
      nodes: {
        description: `List of published ${typeConfig.name}`,
        typeName: typeConfig.name,
        required: true,
        list: [true],
      },
    },
    complexity,
    mutate: async (
      input: {
        [x: string]: any;
      },
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      // Transform global IDs into internal IDs
      const ids = input.ids.map((id) => context.fromGlobalId(id).id);
      const status = input.status;
      let permissions = (typeConfig.mutations || {}).publish;

      // No publish permission configured
      if (!permissions) {
        throw new AccessDeniedError(
          context.res.__(
            "mutationBuilder.createMutation.errors.permissionDenied:You don't have permission to perform this action."
          )
        );
      }

      const hasPermissionFilter = queryFilteringRequired(permissions, context);
      // Run permission filter in transaction as well as publishing job
      // Create node in transaction and validate permissions afterwards
      const nodes = await context.transaction(async (trxContext: Context) => {
        const publishedNodes = await handler.publish({
          typeConfig,
          context: trxContext,
          status,
          ids,
          permissions,
        });

        // Validate if permission matches on created node, if not, throw exception and rollback transaction
        if (hasPermissionFilter) {
          const hasPermission = await handler.hasPermission(
            ids,
            permissions,
            typeConfig,
            trxContext,
            isContentNode
          );
          if (!hasPermission) {
            throw new AccessDeniedError(
              trxContext.res.__(
                "mutationBuilder.createMutation.errors.permissionDenied:You don't have permission to perform this action."
              )
            );
          }
        }

        return publishedNodes;
      });

      // Invalidate surrogate cache
      if (context.surrogateCache) {
        const surrogateKeys: string[] = nodes.reduce((keys, node) => {
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

        // Purge
        await context.surrogateCache.purge(surrogateKeys);
      }

      // Change preview mode in context for path
      context.setPreview(info.path, false);

      return {
        nodes,
      };
    },
    permissions: (typeConfig.mutations && typeConfig.mutations.create) || [],
  };
}

const complexity: ComplexityEstimator = ({ args, childComplexity }) => {
  return (args.input?.ids?.length || 1) * (childComplexity || 1) + 10;
};
