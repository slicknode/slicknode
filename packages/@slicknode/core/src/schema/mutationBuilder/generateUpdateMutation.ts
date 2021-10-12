import {
  FieldAccess,
  FieldConfig,
  isContent,
  isContentUnion,
  MutationConfig,
  ObjectTypeConfig,
} from '../../definition';
import SchemaBuilder from '../builder';
import _ from 'lodash';
import { GraphQLObjectType } from 'graphql';
import { getMutationName } from '../identifiers';
import Context from '../../context';
import { fromGlobalId } from '../../utils/id';
import { getHandler } from '../handler';
import { Permission } from '../../auth';
import { queryFilteringRequired } from '../../auth/utils';
import { AccessDeniedError } from '../../errors';
import { cleanInputValues } from './clearInputValues';
import { getSurrogateKeys } from '../../cache/surrogate/utils';
import toTableName from '../handler/postgres/toTableName';

/**
 * Generates the MutationConfig to create an object of the type
 * @param typeConfig
 * @param schemaBuilder
 */
export function generateUpdateMutation(
  typeConfig: ObjectTypeConfig,
  schemaBuilder: SchemaBuilder
): MutationConfig {
  if (!typeConfig.handler) {
    throw new Error('No handler configured for type ' + typeConfig.name);
  }
  const isContentNode = isContent(typeConfig);

  const inputFields = {
    id: {
      name: 'id',
      typeName: 'ID',
      required: true,
      description: 'The global ID of the object',
      // defaultValue: 'v1',
      validators: [
        {
          type: 'gid',
          config: {
            types: [typeConfig.name],
          },
        },
      ],
    },
  };

  _.forOwn(typeConfig.fields, (fieldConfig: FieldConfig, fieldName: string) => {
    // Ignore fields that do not have update access configured
    if (
      fieldConfig.access &&
      !fieldConfig.access.includes(FieldAccess.UPDATE)
    ) {
      return;
    }

    // For content nodes we need to change / remove some default fields
    if (isContentNode) {
      switch (fieldName) {
        // Remove automatic fields
        case 'contentNode':
        case 'locale':
        case 'status':
        case 'publishedAt':
        case 'publishedBy':
        case 'createdBy':
        case 'lastUpdatedBy':
          return;
      }
    }

    // Transform related objects into ID field
    const type = schemaBuilder.resolveType(fieldConfig.typeName);
    const fieldTypeConfig = schemaBuilder.typeConfigs[fieldConfig.typeName];
    if (fieldConfig.typeName === 'File') {
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'String',
        required: false,
      };
    } else if (fieldTypeConfig && isContent(fieldTypeConfig)) {
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'ID', // Only allow ID
        validators: [
          {
            type: 'gid',
            config: {
              types: ['ContentNode'],
              idType: 'uuid',
            },
          },
        ],
      };
    } else if (type instanceof GraphQLObjectType) {
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'ID',
        required: false,
        validators: [
          {
            type: 'gid',
            config: {
              types: [fieldConfig.typeName],
            },
          },
        ],
      };
    } else if (
      fieldTypeConfig &&
      isContentUnion(fieldTypeConfig, schemaBuilder.typeConfigs)
    ) {
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'ID', // Only allow ID
        required: false,
        validators: [
          {
            type: 'gid',
            config: {
              types: ['ContentNode'],
              idType: 'uuid',
            },
          },
        ],
      };
    } else {
      inputFields[fieldName] = {
        ..._.omit(fieldConfig, ['defaultValue']),
        required: fieldName === 'id',
      };
    }
  });

  const name = getMutationName(typeConfig.name, 'UPDATE');

  return {
    name,
    description: `Updates the ${typeConfig.name}`,
    inputFields,
    fields: {
      node: {
        description: `The updated ${typeConfig.name}`,
        typeName: typeConfig.name,
        required: true,
      },
    },
    complexity: 10,
    async mutate(
      input: {
        [x: string]: any;
      },
      context: Context,
      info
    ) {
      const internalId = fromGlobalId(input.id).id;
      const handler = getHandler(typeConfig.handler);
      let permissions = (typeConfig.mutations || {}).update || null;

      let cleanedInput = cleanInputValues(
        _.omit(input, ['id']),
        typeConfig,
        context
      );

      // Filter permissions that do not include all fields or have full access
      if (permissions) {
        // Use permissions that apply to all input fields
        const inputFieldNames = Object.keys(cleanedInput);
        permissions = permissions.filter((permission: Permission) => {
          // We have full access, no field restrictions
          if (!permission.fields) {
            return true;
          }

          return (
            _.intersection(inputFieldNames, permission.fields).length ===
            inputFieldNames.length
          );
        });
      }

      let node;
      const hasPermissionFilter = queryFilteringRequired(permissions, context);

      // Add lastUpdatedAt value if TimeStampedInterface
      if ((typeConfig.interfaces || []).includes('TimeStampedInterface')) {
        cleanedInput = {
          ...cleanedInput,
          lastUpdatedAt: new Date(),
        };
      }

      // Add auto values for content nodes
      if (isContentNode) {
        const db = context.getDBWrite();
        const statusTable = toTableName(
          context.schemaBuilder.getObjectTypeConfig('ContentStatus'),
          context.getDBSchemaName()
        );
        cleanedInput = {
          ...cleanedInput,
          // If status = PUBLISHED, change the preview version to draft on change
          status: db.raw(
            `case when (status = (select id from ?? where "name" = 'PUBLISHED')) then ` +
              `(select id from ?? WHERE name = 'DRAFT') else (status) end`,
            [statusTable, statusTable]
          ),
          lastUpdatedAt: new Date(),
          lastUpdatedBy: context.auth.uid,
        };
      }

      if (hasPermissionFilter) {
        // Create node in transaction and validate permissions afterwards
        await context.transaction(async (trxContext: Context) => {
          // Validate if permission matches before updating the node, throw exception if not
          let hasPermission = await handler.hasPermission(
            [internalId],
            permissions || [],
            typeConfig,
            trxContext,
            isContentNode // Use preview storage for content nodes
          );
          if (!hasPermission) {
            throw new AccessDeniedError(
              trxContext.res.__(
                "mutationBuilder.updateMutation.errors.permissionDenied:You don't have permission to perform this action."
              )
            );
          }

          // Update node
          node = await handler.update(
            typeConfig,
            internalId,
            cleanedInput,
            trxContext,
            isContentNode // Use preview storage for content nodes
          );

          // Validate if permission matches after updating the node,
          // throw exception and rollback transaction if failed
          hasPermission = await handler.hasPermission(
            [internalId],
            permissions || [],
            typeConfig,
            trxContext,
            isContentNode // Use preview storage for content nodes
          );
          if (!hasPermission) {
            throw new AccessDeniedError(
              trxContext.res.__(
                "mutationBuilder.updateMutation.errors.permissionDenied:You don't have permission to perform this action."
              )
            );
          }
        });
      } else {
        node = await handler.update(
          typeConfig,
          internalId,
          cleanedInput,
          context,
          isContentNode // Use preview storage for content nodes
        );
      }

      // Set to preview mode for content nodes
      if (isContentNode) {
        context.setPreview(info.path, true);
      }

      // Invalidate node
      if (context.surrogateCache) {
        const surrogateKeys = getSurrogateKeys({
          preview: true,
          typeConfig,
          node,
        });
        await context.surrogateCache.purge([
          surrogateKeys.key,
          surrogateKeys.fallbackKey,
        ]);
      }

      return {
        node,
      };
    },
    permissions: (typeConfig.mutations && typeConfig.mutations.update) || [],
  };
}
