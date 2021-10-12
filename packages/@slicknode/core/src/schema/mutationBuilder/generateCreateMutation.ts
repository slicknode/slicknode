import {
  FieldAccess,
  FieldConfig,
  isContent,
  isContentUnion,
  isNode,
  MutationConfig,
  ObjectTypeConfig,
} from '../../definition';
import SchemaBuilder from '../builder';
import { getHandler } from '../handler';
import _ from 'lodash';
import { getMutationName } from '../identifiers';
import Context from '../../context';
import { Permission } from '../../auth';
import { queryFilteringRequired } from '../../auth/utils';
import { AccessDeniedError, ResourceLimitError } from '../../errors';
import { cleanInputValues } from './clearInputValues';
import toTableName from '../handler/postgres/toTableName';
import toColumnName from '../handler/postgres/toColumnName';
import { FieldStorageType } from '../../definition/FieldStorageType';
import { GraphQLResolveInfo } from 'graphql';
import { getSurrogateKeys } from '../../cache/surrogate/utils';

/**
 * Generates the MutationConfig to create an object of the type
 * @param typeConfig
 * @param schemaBuilder
 */
export function generateCreateMutation(
  typeConfig: ObjectTypeConfig,
  schemaBuilder: SchemaBuilder
): MutationConfig {
  if (!typeConfig.handler) {
    throw new Error('No handler configured for type ' + typeConfig.name);
  }
  const handler = getHandler(typeConfig.handler);

  // Assemble input fields and convert related objects to ID field
  const inputFields = {};
  const isContentNode = isContent(typeConfig);
  _.forOwn(typeConfig.fields, (fieldConfig: FieldConfig, fieldName: string) => {
    // Ignore fields that do not have create access configured
    if (
      fieldConfig.access &&
      !fieldConfig.access.includes(FieldAccess.CREATE)
    ) {
      return;
    }

    const fieldConfigOverrides: Partial<FieldConfig> = {};

    // For content nodes we need to change / remove some default fields
    if (isContentNode) {
      switch (fieldName) {
        case 'locale': {
          fieldConfigOverrides.required = false;
          fieldConfigOverrides.typeName = 'String';
          fieldConfigOverrides.validators = [
            {
              type: 'locale',
            },
          ];
          break;
        }
        case 'contentNode': {
          fieldConfigOverrides.required = false;
          break;
        }
        // Remove automatic fields
        case 'id':
        case 'status':
        case 'publishedAt':
        case 'publishedBy':
        case 'createdBy':
        case 'createdAt':
        case 'lastUpdatedBy':
        case 'lastUpdatedAt':
          return;
      }
    }

    // Transform related objects into ID field
    const fieldTypeConfig = schemaBuilder.typeConfigs[fieldConfig.typeName];
    if (!fieldTypeConfig) {
      inputFields[fieldName] = fieldConfig;
    } else if (fieldConfig.typeName === 'File') {
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'String', // We use token for files
        ...fieldConfigOverrides,
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
        ...fieldConfigOverrides,
      };
    } else if (fieldTypeConfig && isNode(fieldTypeConfig)) {
      const idFieldConfig = fieldTypeConfig.fields.id;
      inputFields[fieldName] = {
        ...fieldConfig,
        typeName: 'ID', // Only allow ID
        validators: [
          {
            type: 'gid',
            config: {
              types: [fieldConfig.typeName],
              idType:
                idFieldConfig.storageType === FieldStorageType.UUID
                  ? 'uuid'
                  : 'int',
            },
          },
        ],
        ...fieldConfigOverrides,
      };
    } else if (isContentUnion(fieldTypeConfig, schemaBuilder.typeConfigs)) {
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
        ...fieldConfigOverrides,
      };
    } else {
      inputFields[fieldName] = fieldConfig;
    }
  });

  const name = getMutationName(typeConfig.name, 'CREATE');

  return {
    name,
    description: `Creates a new ${typeConfig.name}`,
    inputFields,
    fields: {
      node: {
        description: `The created ${typeConfig.name}`,
        typeName: typeConfig.name,
        required: true,
      },
    },
    complexity: 10,
    mutate: async (
      input: {
        [x: string]: any;
      },
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      // Transform global IDs into internal IDs
      const cleanedInput = cleanInputValues(input, typeConfig, context);
      let permissions = (typeConfig.mutations || {}).create || null;

      // Filter permissions that do not include all fields
      if (permissions) {
        // Use permissions that apply to all input fields
        const inputFieldNames = Object.keys(input).filter(
          (fieldName: string) => {
            // Remove values that have the default values, because they might have been added by GraphQL
            if (
              inputFields[fieldName] &&
              inputFields[fieldName].hasOwnProperty('defaultValue')
            ) {
              return inputFields[fieldName].defaultValue !== input[fieldName];
            }
            return true;
          }
        );

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

      // Enforce limits
      const limits = await handler.getRecordLimit({
        typeConfig,
        context,
      });
      if (limits.nodes < 1) {
        throw new ResourceLimitError(
          context.res.__(
            'mutationBuilder.createMutation.errors.nodeLimit:You have reached the maximum limit for items of type {{node}}. Please upgrade your plan.',
            {
              node: typeConfig.name,
            }
          )
        );
      } else if (limits.total < 1) {
        throw new ResourceLimitError(
          context.res.__(
            'mutationBuilder.createMutation.errors.totalLimit:You have reached the maximum number of records in your project. Please upgrade your plan.',
            {
              node: typeConfig.name,
            }
          )
        );
      }

      let node;
      const hasPermissionFilter = queryFilteringRequired(permissions, context);
      // Run permission filter in transaction as well as content node dependency creation to
      // avoid stale DB entries
      if (hasPermissionFilter || isContentNode) {
        // Create node in transaction and validate permissions afterwards
        await context.transaction(async (trxContext: Context) => {
          node = await handler.create(
            typeConfig,
            await addDefaultValues({
              typeConfig,
              context: trxContext,
              values: cleanedInput,
            }),
            trxContext,
            isContentNode
          );

          // Validate if permission matches on created node, if not, throw exception and rollback transaction
          if (hasPermissionFilter) {
            const hasPermission = await handler.hasPermission(
              [node.id],
              permissions || [],
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
        });
      } else {
        node = await handler.create(
          typeConfig,
          await addDefaultValues({
            values: cleanedInput,
            context,
            typeConfig,
          }),
          context,
          isContentNode
        );
      }

      if (isContentNode) {
        context.setPreview(info.path, true);
        if (input.locale) {
          context.setLocale(info.path, input.locale);
        }
      }

      // Invalidate node
      if (context.surrogateCache) {
        const { key, fallbackKey } = getSurrogateKeys({
          typeConfig,
          preview: true, // Create is always in preview and non content-nodes don't distinguish between the two
          node,
        });
        await context.surrogateCache.purge([key, fallbackKey]);
      }

      return {
        node,
      };
    },
    permissions: (typeConfig.mutations && typeConfig.mutations.create) || [],
  };
}

type DefaultValues = {
  [key: string]: any;
};

/**
 * Adds additional default values like current user, default locale / status etc.
 * @param params
 */
async function addDefaultValues(params: {
  typeConfig: ObjectTypeConfig;
  context: Context;
  values: DefaultValues;
}): Promise<DefaultValues> {
  const { typeConfig, context, values } = params;
  if (isContent(typeConfig)) {
    const localeTable = toTableName(
      context.schemaBuilder.getObjectTypeConfig('Locale'),
      context.getDBSchemaName()
    );

    // If content node is not provided, create one
    if (!values.contentNode) {
      const contentNode = await context.db.ContentNode.create({
        type: typeConfig.name,
      });
      values.contentNode = contentNode.id;
    }

    // Get values
    if (values.locale) {
      values.locale = context
        .getDBWrite()
        .select('id')
        .from(localeTable)
        .where(toColumnName('isActive'), true)
        .where(toColumnName('code'), values.locale);
    } else {
      values.locale = context
        .getDBWrite()
        .select('id')
        .from(localeTable)
        .where(toColumnName('isDefault'), true);
    }

    const statusTable = toTableName(
      context.schemaBuilder.getObjectTypeConfig('ContentStatus'),
      context.getDBSchemaName()
    );
    values.status = context
      .getDBWrite()
      .select('id')
      .from(statusTable)
      .where(toColumnName('name'), 'DRAFT');
    values.createdAt = new Date();
    values.createdBy = context.auth.uid || null;
  }
  return values;
}
