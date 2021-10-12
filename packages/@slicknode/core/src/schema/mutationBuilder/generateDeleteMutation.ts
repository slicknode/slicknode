import {
  FieldConfigMap,
  isContent,
  MutationConfig,
  ObjectTypeConfig,
} from '../../definition';
import { getHistoryTypeName, getMutationName } from '../identifiers';
import Context from '../../context';
import { fromGlobalId } from '../../utils/id';
import { getHandler } from '../handler';
import { queryFilteringRequired } from '../../auth/utils';
import { AccessDeniedError } from '../../errors';
import _ from 'lodash';
import { getSurrogateKeys } from '../../cache/surrogate/utils';

/**
 * Generates the MutationConfig to delete an object of the type
 * @param typeConfig
 */
export function generateDeleteMutation(
  typeConfig: ObjectTypeConfig
): MutationConfig {
  if (!typeConfig.handler) {
    throw new Error('No handler configured for type ' + typeConfig.name);
  }

  const name = getMutationName(typeConfig.name, 'DELETE');
  const isContentNode = isContent(typeConfig);

  const inputFields: FieldConfigMap = {
    id: {
      typeName: 'ID',
      description: `The ID of the ${typeConfig.name} to be deleted`,
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

  // if (isContentNode) {
  //   inputFields.publishedOnly = {
  //     typeName: 'Boolean',
  //     required: false,
  //     deprecationReason: 'Use dedicated unpublish mutation instead',
  //     description:
  //       'Only delete the published version and keep the preview node.',
  //   };
  // }

  return {
    name,
    description: `Deletes the ${typeConfig.name} with the provided ID`,
    inputFields,
    fields: {
      node: {
        typeName: typeConfig.name,
        description: 'The deleted node',
      },
    },
    complexity: 10,
    mutate: async (
      input: {
        [x: string]: any;
      },
      context: Context
    ) => {
      const internalId = fromGlobalId(input.id).id;
      const handler = getHandler(typeConfig.handler);

      // Check permissions
      const permissions = (typeConfig.mutations || {}).delete || null;
      const hasPermissionFilter = queryFilteringRequired(permissions, context);
      if (hasPermissionFilter) {
        // Create node in transaction and validate permissions afterwards
        const hasPermission = await handler.hasPermission(
          [internalId],
          permissions || [],
          typeConfig,
          context
        );
        if (!hasPermission) {
          throw new AccessDeniedError(
            context.res.__(
              "mutationBuilder.deleteMutation.errors.permissionDenied:You don't have permission to delete this object."
            )
          );
        }
      }

      let deletedObjects: any[] | number;
      if (isContentNode) {
        deletedObjects = await context.transaction(async (trxContext) => {
          // Delete published nodes
          deletedObjects = await handler.delete(
            typeConfig,
            { id: internalId },
            trxContext,
            true,
            false
          );

          // Delete version history
          if (!input.publishedOnly) {
            // Delete preview nodes
            deletedObjects = await handler.delete(
              typeConfig,
              { id: internalId },
              trxContext,
              true,
              true
            );

            const node =
              _.isArray(deletedObjects) && deletedObjects.length
                ? deletedObjects[0]
                : null;

            await handler.delete(
              trxContext.schemaBuilder.getObjectTypeConfig(
                getHistoryTypeName(typeConfig.name)
              ),
              {
                contentNode: node.contentNode,
                locale: node.locale,
              },
              trxContext,
              false,
              false
            );
          }

          return deletedObjects;
        });
      } else {
        deletedObjects = await handler.delete(
          typeConfig,
          { id: internalId },
          context,
          true
        );
      }

      const node =
        _.isArray(deletedObjects) && deletedObjects.length
          ? deletedObjects[0]
          : null;

      // Invalidate node cache if configured
      if (context.surrogateCache) {
        const purgedKeys: string[] = [];

        // If we have content type, add preview keys
        if (isContentNode) {
          const previewKeys = getSurrogateKeys({
            typeConfig,
            node,
            preview: true,
          });
          purgedKeys.push(previewKeys.fallbackKey);
          purgedKeys.push(previewKeys.key);
        }

        // Add published keys
        const publishedKeys = getSurrogateKeys({
          typeConfig,
          node,
          preview: false,
        });
        purgedKeys.push(publishedKeys.fallbackKey);
        purgedKeys.push(publishedKeys.key);

        await context.surrogateCache.purge(purgedKeys);
      }

      return {
        node,
      };
    },
    permissions: (typeConfig.mutations && typeConfig.mutations.delete) || [],
  };
}
