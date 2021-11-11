/**
 * Created by Ivo Meißner on 16.11.16.
 *
 */

import {
  ArgumentConfig,
  ArgumentConfigMap,
  ConnectionConfig,
  ConnectionConfigMap,
  DirectiveConfig,
  EnumValueConfig,
  FieldAccess,
  FieldConfig,
  FieldConfigMap,
  FunctionHandler,
  FunctionKind,
  isContent,
  isContentUnion,
  isNode,
  RFDefinitionKind,
  ModuleConfig,
  MutationConfig,
  ObjectTypeConfig,
  PostMutationHook,
  PreMutationHook,
  RFDefinition,
  TypeConfig,
  TypeConfigMap,
  TypeKind,
} from '../definition';

import { fromGlobalId } from '../utils/id';

import {
  getContentContext,
  getMutationPermissionMap,
  getObjectTypePermissionMap,
  getPersistedTypeExtensionMap,
} from './utils';

import fetch from 'node-fetch';

import { handlerSupportsList } from './handler';
import { isMutateAllowed } from '../auth/index';
import { createAuthorizingResolver, DEFAULT_AUTH_CONTEXT } from '../auth/utils';
import Context from '../context';
import { generateTypeMutations } from './mutationBuilder';

import {
  connectionConfigToConnectionType,
  connectionConfigToEdgeType,
  connectionConfigToFieldConfig,
  connectionConfigToFilterType,
  connectionConfigToOrderType,
  isOneToOneRelation,
  listAllConnection,
  PageInfo,
  typeConfigToFilterType,
  typeConfigToOrderFieldsType,
} from './connectionBuilder';

import { sanitizeInput, validateInput } from '../validation/index';

import {
  DirectiveLocationEnum,
  getNamedType,
  graphql,
  GraphQLBoolean,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLFieldResolver,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputFieldConfig,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLResolveInfo,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType,
  GraphQLUnionType,
  OperationDefinitionNode,
  parse,
  specifiedDirectives,
} from 'graphql';

import { getVariableValues } from 'graphql/execution/values';

import {
  AccessDeniedError,
  LoginRequiredError,
  UserError,
  ValidationError,
} from '../errors';
import _ from 'lodash';
import {
  ResolverConfig,
  ResolverConfigMap,
} from '../definition/ResolverConfig';
import mergeObjectTypePermissionSets from '../auth/mergeObjectTypePermissionSets';
import { enhanceModules } from './enhanceModules';
import { createResolver, defaultTypeResolver } from './resolvers';
import { CACHE_MIN_AGE, CACHE_REMOTE_DATA_DEFAULT_AGE } from '../config';

export const builtInTypes = {
  String: GraphQLString,
  Float: GraphQLFloat,
  Int: GraphQLInt,
  Boolean: GraphQLBoolean,
  ID: GraphQLID,
};

type SchemaBuilderOptions = {
  modules: Array<ModuleConfig>;
};

/**
 * Default input arguments to be added to content node fields
 */
const defaultContentNodeArgs: ArgumentConfigMap = {
  preview: {
    typeName: 'Boolean',
    description: 'Return node in preview status',
  },
  locale: {
    typeName: 'String',
    description: 'ISO 639-1 locale code.',
  },
};

export class SchemaBuilder {
  /**
   * A cache of resolved types names where the object keys are the type names
   * and the value is the GraphQLType
   */
  resolvedTypes: {
    [key: string]: GraphQLNamedType;
  };

  /**
   * A cache of resolved input object types
   */
  _resolveInputObjectTypes: {
    [key: string]: GraphQLInputType;
  };

  /**
   * A map of field configs that are injected in other types.
   */
  relatedFieldConfigs: {
    [key: string]: FieldConfigMap;
  };

  /**
   * A map of the type configs where the key is the GraphQL type name
   */
  typeConfigs: TypeConfigMap;

  /**
   * A map of all types and their connection configs
   */
  connectionConfigs: {
    [key: string]: ConnectionConfigMap;
  };

  /**
   * A map of the mutation configs where the key is the GraphQL mutation name
   */
  mutationConfigs: {
    [name: string]: MutationConfig;
  };

  /**
   * Mutation hooks to execute listener functions before mutating
   */
  _preMutationHooks: {
    [mutationName: string]: Array<PreMutationHook>;
  };

  /**
   * Mutation hooks to execute listener functions after mutating
   */
  _postMutationHooks: {
    [mutationName: string]: Array<PostMutationHook>;
  };

  /**
   * The cached schema
   */
  _schema: GraphQLSchema | undefined | null;

  /**
   * A map that stores a reference from all objects back to the module
   */
  _objectModuleMap: Map<any, ModuleConfig>;

  /**
   * A cached map of all function handlers
   */
  _functionHandlers: Map<ModuleConfig, Map<string, FunctionHandler>>;

  /**
   * A two dimensional map of resolver configs
   */
  _resolvers: ResolverConfigMap;

  /**
   * The underlying module configurations of the schema builder
   */
  _modules: Array<ModuleConfig>;

  /**
   * A cached array of the GraphQL directives
   */
  _directives: Array<GraphQLDirective>;

  /**
   * Cache for field resolvers
   */
  _fieldResolvers: { [typeName: string]: GraphQLFieldResolver<any, Context> };

  /**
   * Constructor
   * @param options
   */
  constructor(options: SchemaBuilderOptions) {
    this.resolvedTypes = {
      ...builtInTypes,
    };
    this._resolveInputObjectTypes = {};
    this._postMutationHooks = {};
    this._preMutationHooks = {};
    this.relatedFieldConfigs = {};
    this.typeConfigs = {
      PageInfo,
    };
    this.connectionConfigs = {};
    this.mutationConfigs = {};
    this._objectModuleMap = new Map();
    this._functionHandlers = new Map();
    this._resolvers = {};
    this._fieldResolvers = {};

    // Enhance modules if module enhancers or remote modules are configured
    const modules = enhanceModules(options.modules);
    this._modules = modules;

    // Get persisted related fields to merge into TypeConfigMap
    const persistedTypeExtensionMap = getPersistedTypeExtensionMap(modules);
    const objectTypePermissionMap = getObjectTypePermissionMap(modules);
    const mutationPermissionMap = getMutationPermissionMap(modules);

    // Assign configs from given app configs
    modules.forEach((appConfig: ModuleConfig) => {
      const generatedConnections: Array<ConnectionConfig> = [];

      // Add type configs
      (appConfig.types || []).forEach((typeConfig: TypeConfig) => {
        let fullTypeConfig: TypeConfig = typeConfig;

        if (
          typeConfig.kind === TypeKind.OBJECT &&
          fullTypeConfig.kind === TypeKind.OBJECT
        ) {
          // Add persisted fields from other modules
          if (persistedTypeExtensionMap.hasOwnProperty(typeConfig.name)) {
            fullTypeConfig = {
              ...typeConfig,
              fields: {
                ...typeConfig.fields,
                // Add related fields at the end omitting all fields that are already
                // part of typeConfig
                ..._.omit(
                  persistedTypeExtensionMap[typeConfig.name],
                  Object.keys(typeConfig.fields)
                ),
              },
            };
          }

          // Merge permissions from other modules
          if (objectTypePermissionMap.hasOwnProperty(typeConfig.name)) {
            fullTypeConfig = mergeObjectTypePermissionSets(
              fullTypeConfig,
              objectTypePermissionMap[typeConfig.name]
            );
          }

          this.typeConfigs[typeConfig.name] = fullTypeConfig;
        }

        this.typeConfigs[typeConfig.name] = fullTypeConfig;
        this._objectModuleMap.set(this.typeConfigs[typeConfig.name], appConfig);

        // If we have a node, add root connection
        if (
          typeConfig.kind === TypeKind.OBJECT &&
          typeConfig.interfaces &&
          typeConfig.interfaces.includes('Node') &&
          typeConfig.directAccess !== false &&
          typeConfig.expose !== false &&
          typeConfig.handler &&
          handlerSupportsList(typeConfig.handler)
        ) {
          generatedConnections.push(listAllConnection(typeConfig));
        }
      });
      (appConfig.mutations || []).forEach((mutationConfig: MutationConfig) => {
        let fullMutationConfig = mutationConfig;
        // If we have additional permissions defined in typePermissions of other modules, merge
        // permissions into mutation config
        if (mutationPermissionMap.hasOwnProperty(mutationConfig.name)) {
          fullMutationConfig = {
            ...mutationConfig,
            permissions: [
              ...(mutationConfig.permissions || []),
              ...mutationPermissionMap[mutationConfig.name],
            ],
          };
        }
        this.mutationConfigs[mutationConfig.name] = fullMutationConfig;
        this._objectModuleMap.set(fullMutationConfig, appConfig);
      });
      // Add listener functions
      (appConfig.listeners || []).forEach((rfDefinition: RFDefinition) => {
        // Save object reference
        this._objectModuleMap.set(rfDefinition, appConfig);

        // Add mutation hooks
        switch (rfDefinition.kind) {
          case RFDefinitionKind.POST_MUTATION:
            if (
              !this._postMutationHooks.hasOwnProperty(rfDefinition.mutationName)
            ) {
              this._postMutationHooks[rfDefinition.mutationName] = [
                rfDefinition,
              ];
            } else {
              this._postMutationHooks[rfDefinition.mutationName].push(
                rfDefinition
              );
            }
            break;
          case RFDefinitionKind.PRE_MUTATION:
            if (
              !this._preMutationHooks.hasOwnProperty(rfDefinition.mutationName)
            ) {
              this._preMutationHooks[rfDefinition.mutationName] = [
                rfDefinition,
              ];
            } else {
              this._preMutationHooks[rfDefinition.mutationName].push(
                rfDefinition
              );
            }
            break;
          default:
            throw new Error(
              `Invalid listener kind ${(rfDefinition as RFDefinition).kind}`
            );
        }
      });
      // Add custom resolver configurations, merge into resolvers config map
      if (appConfig.resolvers) {
        Object.keys(appConfig.resolvers).forEach((typeName) => {
          Object.keys(appConfig.resolvers[typeName]).forEach((fieldName) => {
            if (_.get(this._resolvers, `${typeName}.${fieldName}`)) {
              throw new Error(
                `Duplicate resolver definition for field ${typeName}.${fieldName} in module ${appConfig.id}`
              );
            } else {
              // Update resolver config map

              const resolverConfig: ResolverConfig =
                appConfig.resolvers[typeName][fieldName];
              _.set(
                this._resolvers,
                `${typeName}.${fieldName}`,
                resolverConfig
              );
              this._objectModuleMap.set(resolverConfig, appConfig);
            }
          });
        });
      }
      // Combine generated with configured connections
      const connections = [
        ...(appConfig.connections || []),
        ...generatedConnections,
      ];
      if (connections && connections.length) {
        connections.forEach((connectionConfig: ConnectionConfig) => {
          this._objectModuleMap.set(connectionConfig, appConfig);
          if (
            !this.connectionConfigs.hasOwnProperty(
              connectionConfig.source.typeName
            )
          ) {
            this.connectionConfigs[connectionConfig.source.typeName] = {};
          }
          this.connectionConfigs[connectionConfig.source.typeName][
            connectionConfig.name
          ] = connectionConfig;
        });
      }
      // Add fields to related objects
      _.each(
        appConfig.typeExtensions,
        (fields: FieldConfigMap, typeName: string) => {
          this.relatedFieldConfigs[typeName] = {
            ...(this.relatedFieldConfigs[typeName] || {}),
            ...fields,
          };
        }
      );
    });

    // Create connections for types on Query type
    _.forOwn(this.typeConfigs, (conf: TypeConfig) => {
      // Add root fields if we have a Node
      if (
        isNode(conf) &&
        conf.expose !== false &&
        conf.directAccess !== false
      ) {
        this.relatedFieldConfigs['Query'] = {
          ...this._getNodeQueryFields(conf),
          ...(this.relatedFieldConfigs['Query'] || {}),
        };
      }
    });

    // Create filter types for object types.
    _.forOwn(this.typeConfigs, (conf: TypeConfig) => {
      // Generate filter config for type
      const filterType = typeConfigToFilterType(
        conf,
        this.typeConfigs,
        this.connectionConfigs
      );
      if (filterType) {
        this.typeConfigs[filterType.name] = filterType;
      }
      if (isNode(conf)) {
        const orderableFields = typeConfigToOrderFieldsType(conf);
        if (orderableFields) {
          this.typeConfigs[orderableFields.name] = orderableFields;
        }
      }
    });

    // Generate type configs for connectionFields and add to typeConfigs
    _.forOwn(
      this.connectionConfigs,
      (connectionConfigs: ConnectionConfigMap) => {
        _.forOwn(connectionConfigs, (connectionConfig: ConnectionConfig) => {
          // We don't need connection types for 1:1 relations
          if (isOneToOneRelation(connectionConfig, this.typeConfigs)) {
            return;
          }
          const connectionType =
            connectionConfigToConnectionType(connectionConfig);
          const edgeType = connectionConfigToEdgeType(
            connectionConfig,
            this.typeConfigs
          );
          const filterType = connectionConfigToFilterType(connectionConfig);
          const orderType = connectionConfigToOrderType(connectionConfig);
          this.typeConfigs[connectionType.name] = connectionType;
          this.typeConfigs[edgeType.name] = edgeType;
          this.typeConfigs[filterType.name] = filterType;
          this.typeConfigs[orderType.name] = orderType;
        });
      }
    );

    // Cache directives
    this._directives = this._getDirectives();
  }

  /**
   * Returns the GraphQLSchema
   */
  getSchema(): GraphQLSchema {
    if (!this._schema) {
      // Create all types so that they can be discovered through interfaces too
      const types: GraphQLNamedType[] = [..._.values(builtInTypes)];
      _.forOwn(this.typeConfigs, (typeConfig: TypeConfig, typeName: string) => {
        if (
          (typeConfig.kind === TypeKind.OBJECT &&
            typeConfig.hasOwnProperty('expose') &&
            !typeConfig.expose) ||
          typeConfig.name === 'Mutation' ||
          typeConfig.name === 'Query'
        ) {
          return;
        }

        if (typeConfig.kind === TypeKind.INPUT_OBJECT) {
          types.push(
            this.resolveInputObjectType(typeName) as GraphQLInputObjectType
          );
        } else {
          types.push(this.resolveType(typeName));
        }
      });

      const query = this.resolveType('Query');
      if (!(query instanceof GraphQLObjectType)) {
        throw new Error('Query type must be of type GraphQLObjectType');
      }
      const mutation = this.getMutationType();
      if (mutation) {
        types.push(mutation);
      }

      this._schema = new GraphQLSchema({
        query,
        mutation,
        types,
        directives: this._directives || [],
      });
    }

    return this._schema;
  }

  /**
   * Returns the GraphQL mutation type, NULL if there are no mutations
   */
  getMutationType(): GraphQLObjectType | undefined | null {
    return Object.keys(this.mutationConfigs).length !== 0
      ? new GraphQLObjectType({
          name: 'Mutation',
          description: 'The root mutation type',
          fields: this.getMutationFields.bind(this),
        })
      : null;
  }

  /**
   * Returns the mutation fields
   * @returns {{}}
   */
  getMutationFields(): GraphQLFieldConfigMap<any, Context> {
    const fields = {};
    const generatedMutations = {};

    // Auto generate mutations of types
    _.each(this.typeConfigs, (typeConfig: TypeConfig) => {
      if (typeConfig.kind === TypeKind.OBJECT && typeConfig.mutations) {
        _.assign(generatedMutations, generateTypeMutations(typeConfig, this));
      }
    });

    // Add all mutations from mutation configs
    _.each(
      { ...generatedMutations, ...this.mutationConfigs },
      (mutationConfig: MutationConfig, name: string) => {
        // Check if field is defined
        if (mutationConfig.field) {
          fields[name] = (mutationConfig.field as GraphQLField<any, any>).type
            ? mutationConfig.field
            : this.fieldConfigToField({
                config: mutationConfig.field as FieldConfig, // We have FieldConfig for sure, bcs. otherwise field is directly
                fieldName: mutationConfig.name,
                typeName: (mutationConfig.field as FieldConfig).typeName,
              });
          return;
        }

        let outputType;
        if (mutationConfig.outputTypeName) {
          // Use custom output type
          outputType = this.resolveType(mutationConfig.outputTypeName);
        } else {
          // We don't have output type, so build one from fields
          const outputTypeName = name + 'Payload';
          outputType = new GraphQLObjectType({
            name: outputTypeName,
            fields: (): GraphQLFieldConfigMap<any, Context> => {
              return _.mapValues(
                mutationConfig.fields,
                (fieldConfig: FieldConfig, fieldName: string) => {
                  return this.fieldConfigToField({
                    config: fieldConfig,
                    fieldName,
                    typeName: outputTypeName,
                  });
                }
              ) as GraphQLFieldConfigMap<any, Context>; // @TODO: Fix typing here
            },
          });
        }

        let inputType;
        if (mutationConfig.inputTypeName) {
          // Use custom input type
          inputType = this.resolveInputObjectType(mutationConfig.inputTypeName);
        } else {
          const inputTypeName = this._getMutationInputTypeName(
            mutationConfig.name
          );
          inputType = new GraphQLInputObjectType({
            name: inputTypeName,
            fields: (): GraphQLInputFieldConfigMap => {
              return _.mapValues(
                mutationConfig.inputFields,
                (fieldConfig: FieldConfig, fieldName: string) => {
                  // @TODO: Create fieldConfigToInputField function that returns proper type
                  return this.fieldConfigToField({
                    config: fieldConfig,
                    fieldName,
                    input: true,
                    typeName: inputTypeName,
                  });
                }
              ) as unknown as GraphQLInputFieldConfigMap; // @TODO: Fix types here
            },
          });
        }

        fields[name] = {
          type: outputType,
          description: mutationConfig.description,
          deprecationReason: mutationConfig.deprecationReason,
          args: {
            input: { type: new GraphQLNonNull(inputType) },
          },
          extensions: {
            complexity:
              typeof mutationConfig.complexity !== undefined
                ? mutationConfig.complexity
                : 10,
          },
          resolve: async (
            source: any,
            { input },
            context: Context,
            info: GraphQLResolveInfo
          ) => {
            // Check if we have mutation handler defined
            let mutate = mutationConfig.mutate;
            if (!mutate) {
              const resolver = this.getResolver('Mutation', name);
              if (!resolver) {
                throw new UserError(
                  `Resolver for mutation "${name}" is not implemented`
                );
              }
              // Wrap resolver to match mutate function signature
              mutate = async (
                mutationInput: {
                  [x: string]: any;
                },
                mutationContext: Context,
                mutationInfo: GraphQLResolveInfo
              ) => {
                return await resolver(
                  {},
                  { input: mutationInput },
                  mutationContext,
                  mutationInfo
                );
              };
            }

            // Check permissions
            if (!context.auth.write) {
              // Set to anonymous user, so that user cannot hijack user context with session cookie
              context.auth = DEFAULT_AUTH_CONTEXT;
            }
            if (!isMutateAllowed(input, context.auth, mutationConfig)) {
              if (context.auth.uid) {
                throw new AccessDeniedError(
                  context.res.__(
                    "You don't have permission to perform this action"
                  )
                );
              } else {
                throw new LoginRequiredError(
                  context.res.__('You must be logged in to perform this action')
                );
              }
            }

            // Sanitize input values
            let sanitizedInput = sanitizeInput(
              mutationConfig.inputFields,
              input
            );

            // Validate input
            // @TODO: As a temporary workaround, we catch the exception and build the validation error
            // for the input arg. We should change this to allow for more input args instead
            try {
              validateInput(
                mutationConfig.inputFields,
                sanitizedInput,
                context
              );
            } catch (e) {
              if (e instanceof ValidationError) {
                throw new ValidationError(e.message, {
                  input: Object.keys(e.argumentErrors).reduce(
                    (fieldErrors, argName) => {
                      for (const childError of e.argumentErrors[argName]) {
                        fieldErrors.push({
                          message: childError.message,
                          path: [...(childError.path || []), argName],
                        });
                      }
                      return fieldErrors;
                    },
                    []
                  ),
                });
              }
            }

            // Check for pre mutation hooks if there are any
            if (this._preMutationHooks.hasOwnProperty(mutationConfig.name)) {
              // Create array of promises from listener function definitions
              const sequentialHooks = this._preMutationHooks[
                mutationConfig.name
              ]
                .filter((hook: PreMutationHook) => {
                  return hook.returnsInputData;
                })
                .sort(
                  (hookA: PreMutationHook, hookB: PreMutationHook) =>
                    (hookA.priority || Infinity) - (hookB.priority || Infinity)
                )
                .map((hook) =>
                  this._createPreMutationHook({ hook, mutationConfig, context })
                );

              const concurrentHooks = this._preMutationHooks[
                mutationConfig.name
              ]
                .filter((hook: PreMutationHook) => {
                  return !hook.returnsInputData;
                })
                .map((hook) =>
                  this._createPreMutationHook({ hook, mutationConfig, context })
                );

              try {
                // Execute sequential hooks while updating / re-validating args
                // Build variable definitions for re-validation of listener return values through GraphQL type schema
                const variableDefinitions = (
                  parse(
                    `query A($input: ${this._getMutationInputTypeName(
                      mutationConfig.name
                    )}!){a(input: $input)}`
                  ).definitions[0] as OperationDefinitionNode
                ).variableDefinitions;

                // Execute hooks sequentially
                for (let i = 0; i < sequentialHooks.length; i++) {
                  const hookResult = await sequentialHooks[i]({
                    input: sanitizedInput,
                  });

                  // Check if hook returns args
                  if (!hookResult.hasOwnProperty('args')) {
                    throw new UserError(
                      `Listener for mutation.${mutationConfig.name}.BEFORE event returned no args ` +
                        'but has "returnsInputData" enabled'
                    );
                  }
                  sanitizedInput = hookResult.args.input;

                  // Run returned input arg through schema validation again
                  const variableValues = getVariableValues(
                    this.getSchema(),
                    variableDefinitions as any, // @TODO: Fix types once this is merged: https://github.com/graphql/graphql-js/pull/2224
                    { input: sanitizedInput }
                  );
                  if (variableValues.errors && variableValues.errors.length) {
                    throw new Error(
                      `Invalid args returned from listener mutation.${mutationConfig.name}.BEFORE: \n` +
                        variableValues.errors
                          .map((err) => err.message)
                          .join('\n')
                    );
                  } else {
                    sanitizedInput = variableValues.coerced.input || {};
                  }

                  // Validate input
                  validateInput(
                    mutationConfig.inputFields,
                    sanitizedInput,
                    context
                  );
                }

                // Execute remaining listeners in parallel
                await Promise.all(
                  concurrentHooks.map((hook) => hook({ input: sanitizedInput }))
                );
              } catch (err) {
                throw err;
              }
            }

            // Run actual mutation and get result
            const result = await mutate(sanitizedInput, context, info);

            // Check for mutation hooks if there are any
            if (this._postMutationHooks.hasOwnProperty(mutationConfig.name)) {
              // Create schema with mutation payload as query node to get hook payload
              const query = getNamedType(
                info.schema.getMutationType().getFields()[mutationConfig.name]
                  .type
              );
              if (!(query instanceof GraphQLObjectType)) {
                throw new Error(
                  'Mutation Payload needs to be of GraphQLObjectType'
                );
              }
              const schema = new GraphQLSchema({
                query,
                types: _.values(info.schema.getTypeMap()),
              });
              // Get postHooks
              const postHooks = this._postMutationHooks[
                mutationConfig.name
              ].map(async (hook) => {
                const app = this._getModule(hook);
                const handler = this._getFunctionHandler(app, hook.handler);
                let data = null;
                if (hook.query) {
                  const queryResult = await graphql(
                    schema,
                    hook.query,
                    result,
                    context
                  );
                  if (queryResult && queryResult.data) {
                    data = queryResult.data;
                  }
                }
                const payload = {
                  args: {
                    input: sanitizedInput,
                  },
                  event: `mutation.${mutationConfig.name}.AFTER`,
                  data,
                };
                return await handler(payload, context);
              });
              try {
                await Promise.all(postHooks);
              } catch (error) {
                // @TODO: Logging
                console.log('Error in post mutation hook', error);
              }
            }

            return result;
          },
        };
      }
    );
    return fields;
  }

  /**
   * Returns the related fields for the given type
   * @param name
   */
  getTypeExtensions(name: string): GraphQLFieldConfigMap<any, Context> {
    if (this.relatedFieldConfigs.hasOwnProperty(name)) {
      return _.mapValues(
        this.relatedFieldConfigs[name],
        (config: FieldConfig, fieldName: string) => {
          return this.fieldConfigToField({ config, fieldName, typeName: name });
        }
      ) as GraphQLFieldConfigMap<any, Context>;
    }

    return {};
  }

  /**
   * Creates the pre mutation hook function
   * @param options
   * @private
   */
  _createPreMutationHook(options: {
    mutationConfig: MutationConfig;
    hook: PreMutationHook;
    context: Context;
  }): Function {
    const { mutationConfig, hook, context } = options;
    return async (args) => {
      const moduleConfig = this._getModule(hook);
      const handler = this._getFunctionHandler(moduleConfig, hook.handler);
      const payload = {
        args,
        event: `mutation.${mutationConfig.name}.BEFORE`,
      };
      return await handler(payload, context);
    };
  }

  /**
   * Returns a field map of all fields that return a single node of the given type
   * Those will be added to Query type, for example for getUserById etc.
   *
   * @param typeConfig
   * @returns {{}}
   */
  _getNodeQueryFields(typeConfig: ObjectTypeConfig): FieldConfigMap {
    const map = {};

    const nameParts = typeConfig.name.split('_');
    const typeName = nameParts[nameParts.length - 1];
    const namespace =
      nameParts.length > 1
        ? nameParts.slice(0, nameParts.length - 1).join('_') + '_'
        : '';
    const prefix =
      namespace +
      'get' +
      typeName.charAt(0).toUpperCase() +
      typeName.slice(1) +
      'By';
    const isContentNode = isContent(typeConfig);

    _.forOwn(typeConfig.fields, (field: FieldConfig, name: string) => {
      if (
        name === 'id' ||
        (field.unique && !field.list) ||
        (isContentNode && name === 'contentNode')
      ) {
        let argType;
        if (builtInTypes.hasOwnProperty(field.typeName)) {
          argType = field.typeName;
        } else {
          // Determine what field type we need for input argument
          const fieldTypeConfig = this.typeConfigs[field.typeName];
          if (!fieldTypeConfig) {
            throw new Error(
              `Type ${field.typeName} was not found in type registry`
            );
          }
          // If we have object, interface or union type, we use ID
          if (
            [TypeKind.OBJECT, TypeKind.UNION, TypeKind.INTERFACE].includes(
              fieldTypeConfig.kind
            )
          ) {
            argType = 'ID';
          } else {
            // Use type of field value
            argType = field.typeName;
          }
        }

        // Add content args for content node
        let contentArgs: ArgumentConfigMap = isContentNode
          ? defaultContentNodeArgs
          : {};

        const fieldConfig = {
          typeName: typeConfig.name,
          required: false,
          list: false,
          description: `Returns a ${typeConfig.name} by ${name}`,
          arguments: {
            [name]: {
              typeName: argType,
              description: field.description,
              required: true,
              list: false,
            },
            ...contentArgs,
          },
          complexity: (options: {
            args: {
              [x: string]: any;
            };
            childComplexity: number;
          }) => 1 + options.childComplexity,
          resolve(
            obj: any,
            args: {
              [x: string]: any;
            },
            context: Context,
            info: GraphQLResolveInfo
          ) {
            let value = args[name];
            if (argType === 'ID') {
              const { id } = fromGlobalId(value);
              value = id;
            }

            // Get / update content context
            const { preview, locale } = getContentContext({
              context,
              args,
              info,
            });

            return context
              .getLoader(
                typeConfig.name,
                name,
                preview,
                name !== 'id' ? locale : null
              )
              .load(value);
          },
        };

        // Determine the field name
        const fieldName = prefix + name.charAt(0).toUpperCase() + name.slice(1);

        map[fieldName] = {
          ...fieldConfig,
          // resolve
        };
      }
    });

    return map;
  }

  /**
   * Returns the type for the given name
   * @param name
   */
  resolveType(name: string): GraphQLNamedType {
    if (name in this.resolvedTypes) {
      return this.resolvedTypes[name];
    }
    if (!(name in this.typeConfigs)) {
      throw new Error(`The type ${name} is not configured in SchemaBuilder`);
    }
    const typeConfig: TypeConfig = this.typeConfigs[name];

    // Check if type is only private
    if (
      typeConfig.kind === TypeKind.OBJECT &&
      typeConfig.hasOwnProperty('expose') &&
      !typeConfig.expose
    ) {
      throw new Error(
        'Type ' +
          name +
          ' is not exposed in configuration and cannot be resolved'
      );
    }

    // Check if type is defined directly in config
    if (typeConfig.type) {
      this.resolvedTypes[name] = typeConfig.type;
    } else {
      // Get description and translate
      const description = typeConfig.description;
      const deprecationReason = typeConfig.deprecationReason;

      // Check what kind we have
      switch (typeConfig.kind) {
        case TypeKind.INTERFACE: {
          this.resolvedTypes[name] = new GraphQLInterfaceType({
            name,
            description,
            fields: () => {
              // Add all related fields
              const typeExtensions = this.getTypeExtensions(name);
              const fields = {};
              _.forOwn(
                typeConfig.fields,
                (fieldConfig: FieldConfig, fieldName: string) => {
                  // Ignore non exposed fields
                  if (
                    fieldConfig.hasOwnProperty('access') &&
                    !(fieldConfig.access || []).includes(FieldAccess.READ)
                  ) {
                    return;
                  }
                  fields[fieldName] = this.fieldConfigToField({
                    config: fieldConfig,
                    fieldName,
                    typeName: name,
                  });
                }
              );

              return {
                ...typeExtensions,
                ...fields,
              } as GraphQLFieldConfigMap<any, Context>;
            },
            resolveType: typeConfig.resolveType || defaultTypeResolver,
          });
          break;
        }
        case TypeKind.OBJECT: {
          // Get interfaces
          let interfaces = null;
          if (typeConfig.interfaces && typeConfig.interfaces.length > 0) {
            interfaces = _.map(typeConfig.interfaces, (typeName) => {
              const interfaceType = this.resolveType(typeName);
              if (!(interfaceType instanceof GraphQLInterfaceType)) {
                throw new Error(
                  `The type ${typeName} is not an interface type`
                );
              }
              return interfaceType;
            });
          }

          // Create object type
          this.resolvedTypes[name] = new GraphQLObjectType({
            name,
            description,
            fields: () => {
              // Add all related fields
              const typeExtensions = this.getTypeExtensions(name);
              const fields = {};
              _.forOwn(
                typeConfig.fields,
                (fieldConfig: FieldConfig, fieldName: string) => {
                  // Ignore non exposed fields
                  if (
                    fieldConfig.hasOwnProperty('access') &&
                    !(fieldConfig.access || []).includes(FieldAccess.READ)
                  ) {
                    return;
                  }

                  // Create resolving function
                  fields[fieldName] = this.fieldConfigToField({
                    config: fieldConfig,
                    fieldName,
                    input: false,
                    typeConfig,
                    typeName: name,
                  });
                }
              );

              // Add connectionFields
              const connectionFields = _.mapValues(
                this.connectionConfigs[name] || {},
                (connectionConfig: ConnectionConfig, fieldName: string) => {
                  const fieldConfig = connectionConfigToFieldConfig(
                    connectionConfig,
                    this.typeConfigs
                  );
                  return this.fieldConfigToField({
                    config: fieldConfig,
                    fieldName,
                    typeName: name,
                  });
                }
              );

              return {
                ...fields,
                ..._.omit(typeExtensions, [
                  ...Object.keys(fields),
                  ...Object.keys(connectionFields),
                ]),
                ..._.omit(connectionFields, [...Object.keys(fields)]),
              };
            },
            interfaces,
          });
          break;
        }
        case TypeKind.ENUM: {
          // Create GraphQL enum type
          this.resolvedTypes[name] = new GraphQLEnumType({
            name,
            description,
            values: _.mapValues(
              typeConfig.values,
              (valueConfig: EnumValueConfig) => {
                // Translate descriptions etc. if i18n is enabled
                return {
                  value: valueConfig.value,
                  description: valueConfig.description || null,
                  deprecationReason: valueConfig.deprecationReason || null,
                };
              }
            ) as GraphQLEnumValueConfigMap,
          });
          break;
        }
        case TypeKind.UNION: {
          this.resolvedTypes[name] = new GraphQLUnionType({
            name,
            description,
            // deprecationReason,
            types: () =>
              typeConfig.typeNames.map((unionTypeName) => {
                const type = this.resolveType(unionTypeName);
                if (!(type instanceof GraphQLObjectType)) {
                  throw new Error(
                    `${unionTypeName} is not of GraphQLObjectType and can't be used in union type ${name}`
                  );
                }
                return type;
              }),
            resolveType: typeConfig.resolveType || defaultTypeResolver,
          });
          break;
        }
        default: {
          throw new Error(
            `Invalid kind configured for type ${typeConfig.name}`
          );
        }
      }
    }
    return this.resolvedTypes[name];
  }

  /**
   * Resolves the input object type for the given name
   * @param name
   */
  resolveInputObjectType(name: string): GraphQLInputType {
    if (!this._resolveInputObjectTypes.hasOwnProperty(name)) {
      if (
        !(name in this.resolvedTypes) &&
        !this.typeConfigs.hasOwnProperty(name)
      ) {
        throw new Error(`No typeConfig registered in builder for type ${name}`);
      }

      // We have builtin type
      if (!this.typeConfigs.hasOwnProperty(name)) {
        this._resolveInputObjectTypes[name] = builtInTypes[name];
      } else {
        // We have type via typeConfig, so generate
        const typeConfig: TypeConfig = this.typeConfigs[name];

        switch (typeConfig.kind) {
          case TypeKind.INPUT_OBJECT:
          case TypeKind.OBJECT: {
            const inputTypeName =
              typeConfig.kind === TypeKind.INPUT_OBJECT
                ? name
                : `_${name}Input`;

            this._resolveInputObjectTypes[name] = new GraphQLInputObjectType({
              name: inputTypeName,
              description: typeConfig.description,
              fields: () => {
                const fields = {};
                // Get typeConfig from original object type
                _.forOwn(
                  typeConfig.fields,
                  (fieldConfig: FieldConfig, fieldName: string) => {
                    // Ignore non exposed fields
                    // @TODO: We just check if we can create the field. Maybe we need to
                    // extend the functionality to update as well, or maybe this here
                    // is not needed at all, since this only probably applies to ID fields
                    // that are not part of custom input types anyways
                    if (
                      fieldConfig.hasOwnProperty('access') &&
                      !(fieldConfig.access || []).includes(FieldAccess.CREATE)
                    ) {
                      return;
                    }

                    fields[fieldName] = this.fieldConfigToField({
                      config: fieldConfig,
                      fieldName,
                      input: true,
                      typeName: name,
                    });
                  }
                );
                return fields;
              },
            });
            break;
          }
          case TypeKind.SCALAR: {
            const scalarType = this.resolveType(name);
            if (!(scalarType instanceof GraphQLScalarType)) {
              throw new Error(`Type ${name} is not of type GraphQLScalarType`);
            }
            this._resolveInputObjectTypes[name] = scalarType;
            break;
          }
          case TypeKind.ENUM: {
            const type = this.resolveType(name);
            if (!(type instanceof GraphQLEnumType)) {
              throw new Error(`Type ${name} is not of type GraphQLEnumType`);
            }
            this._resolveInputObjectTypes[name] = type;
            break;
          }
          default: {
            throw new Error(
              `Type ${name} could not be converted to input type`
            );
          }
        }
      }
    }
    return this._resolveInputObjectTypes[name];
  }

  /**
   * Converts the `FieldConfig` to the GraphQLField definition
   * @param options
   */
  fieldConfigToField(options: {
    config: FieldConfig;
    fieldName: string;
    // The typeName of the type that it belongs to
    typeName: string;
    // Returns a field for input if true
    input?: boolean;
    // If the typeConfig is provided, the field will also add permissions to the resolver
    typeConfig?: ObjectTypeConfig | null;
  }): GraphQLFieldConfig<any, Context> {
    // @FIXME: Separate output and input field config
    const { config, fieldName, typeName } = options;
    const input = options.input || false;
    const typeConfig = options.typeConfig || null;

    if (config.field) {
      return config.field;
    }
    let type: GraphQLType = input
      ? this.resolveInputObjectType(config.typeName)
      : this.resolveType(config.typeName);

    // Create wrapped type (list, non-null)
    if (config.list) {
      let dimensions: Array<boolean> = [];
      if (config.list === true) {
        dimensions = [config.required || false];
      } else {
        dimensions = config.list as boolean[];
      }
      dimensions.forEach((required) => {
        if (required) {
          type = new GraphQLList(new GraphQLNonNull(type));
        } else {
          type = new GraphQLList(type);
        }
      });
    }

    // Get field type config
    const fieldTypeConfig = this.typeConfigs[config.typeName];
    const isContentNode = fieldTypeConfig && isContent(fieldTypeConfig);

    if (
      config.required &&
      (!input || (input && _.isUndefined(config.defaultValue))) &&
      !(type instanceof GraphQLNonNull) &&
      (!(isContentNode && !config.list) || (isContentNode && input)) // Only add Non-NULL for content nodes that are lists
    ) {
      type = new GraphQLNonNull(type);
    }

    // Build input argument map, add content node input args
    let inputArguments: ArgumentConfigMap = config.arguments;
    if (fieldTypeConfig && isContentNode && fieldName !== 'node') {
      inputArguments = {
        ...(inputArguments || {}),
        ...defaultContentNodeArgs,
      };
    }

    // Add arguments
    let args = null;
    if (inputArguments) {
      args = this.resolveArgumentConfigMap(inputArguments);
    }

    // Add default value for input object
    const gqlFieldConfig: GraphQLFieldConfig<any, Context> = {
      type,
      description: config.description,
      args,
      deprecationReason: config.deprecationReason,
    } as GraphQLFieldConfig<any, Context>;
    if (input && config.hasOwnProperty('defaultValue')) {
      (gqlFieldConfig as unknown as GraphQLInputFieldConfig).defaultValue =
        config.defaultValue;
    }

    // Add resolver if we have output type
    if (!input) {
      let complexity = config.complexity;

      // Create resolver for related fields on object
      let resolve = config.resolve || this.getResolver(typeName, fieldName);

      if (
        this.typeConfigs.hasOwnProperty(config.typeName) &&
        (this.typeConfigs[config.typeName].kind === TypeKind.OBJECT ||
          isContentUnion(this.typeConfigs[config.typeName], this.typeConfigs))
      ) {
        // Add default complexity for nodes
        if (typeof complexity === 'undefined') {
          complexity = config.typeName !== 'ContentNode' ? 1 : 0; // (options: {args: Object, childComplexity: number}) => 1 + options.childComplexity;
        }

        if (!resolve) {
          // Create resolver if does not exist
          if (!this._fieldResolvers.hasOwnProperty(config.typeName)) {
            this._fieldResolvers[config.typeName] = createResolver({
              typeName: config.typeName,
            });
          }
          resolve = this._fieldResolvers[config.typeName];
        }
      }

      // Add complexity
      if (complexity) {
        gqlFieldConfig.extensions = {
          complexity,
        };
      }

      // Add authorization to resolver if we have field for object type
      if (input === false && typeConfig) {
        resolve = createAuthorizingResolver(
          fieldName,
          {
            ...config,
            ...(resolve ? { resolve } : {}),
          },
          typeConfig,
          this.typeConfigs
        );
      }
      gqlFieldConfig.resolve = resolve;
    }

    return gqlFieldConfig;
  }

  /**
   * Returns the merge info for schema stitching with remote schemas
   */
  getMergeInfo() {}

  /**
   * Returns the type config for the given name
   * @param name
   */
  getObjectTypeConfig(name: string): ObjectTypeConfig {
    if (
      this.typeConfigs.hasOwnProperty(name) &&
      this.typeConfigs[name].kind === TypeKind.OBJECT
    ) {
      return this.typeConfigs[name] as ObjectTypeConfig;
    }

    throw new Error(
      `ObjectTypeConfig for type ${name} not registered in schema builder`
    );
  }

  /**
   * Returns a custom resolver for the given type and field if available, otherwise NULL
   * @param typeName
   * @param fieldName
   */
  getResolver(
    typeName: string,
    fieldName: string
  ): (
    source: any,
    args: {
      [key: string]: any;
    },
    context: Context,
    info: GraphQLResolveInfo
  ) => Promise<any> | undefined | null {
    // Check if custom resolver is defined
    if (
      this._resolvers.hasOwnProperty(typeName) &&
      this._resolvers[typeName].hasOwnProperty(fieldName)
    ) {
      // Create resolver with handler
      return async (
        source: {
          [x: string]: any;
        },
        inputArgs: {
          [x: string]: any;
        },
        // info: GraphQLResolveInfo
        context: Context
      ): Promise<any> => {
        const resolverConfig = this._resolvers[typeName][fieldName];
        const resolverModule = this._getModule(resolverConfig);
        const payload = {
          event: `resolve.${typeName}.${fieldName}`,
          source,
          args: inputArgs,
        };

        const handler = this._getFunctionHandler(
          resolverModule,
          resolverConfig.handler
        );
        const result = await handler(payload, context);

        // Set surrogate cache maxAge
        if (context.surrogateCache) {
          let maxAge = _.get(result, 'cache.maxAge');
          if (typeof maxAge !== 'number') {
            maxAge = CACHE_REMOTE_DATA_DEFAULT_AGE;
          }
          context.surrogateCache.setMaxAge(Math.max(CACHE_MIN_AGE, maxAge));
        }

        return result.data;
      };
    }

    return null;
  }

  resolveArgumentConfigMap(
    argMap: ArgumentConfigMap
  ): GraphQLFieldConfigArgumentMap {
    return _.mapValues(argMap, (argConfig: ArgumentConfig) => {
      let argType = this.resolveInputObjectType(argConfig.typeName);

      // Create wrapped type (list, non-null)
      if (argConfig.list) {
        let dimensions: Array<boolean> = [];
        if (argConfig.list === true) {
          dimensions = [argConfig.required || false];
        } else {
          dimensions = argConfig.list as boolean[];
        }
        dimensions.forEach((required) => {
          if (required) {
            argType = new GraphQLList(new GraphQLNonNull(argType));
          } else {
            argType = new GraphQLList(argType);
          }
        });
      }
      if (argConfig.required) {
        argType = new GraphQLNonNull(argType);
      }

      return {
        type: argType,
        description: argConfig.description,
        // @TODO: Deprecation not supported by GraphQL Spec for input args as of right now
        // Enable once supported: https://github.com/graphql/graphql-spec/pull/805
        // deprecationReason: argConfig.deprecationReason,
      };
    }) as GraphQLFieldConfigArgumentMap;
  }

  /**
   * Returns all modules of the schema
   */
  getModules(): Array<ModuleConfig> {
    return this._modules;
  }

  /**
   * Returns the directives
   * @returns {Array<>}
   * @private
   */
  _getDirectives(): Array<GraphQLDirective> {
    const directives = [
      // Add builtin directives
      ...specifiedDirectives,
    ];
    // const names = [];
    const locationNames: { [location: string]: string[] } = {};

    this.getModules().forEach((module: ModuleConfig) => {
      if (module.directives && module.directives.length) {
        module.directives.forEach((config: DirectiveConfig) => {
          config.locations.forEach((location) => {
            if (
              locationNames.hasOwnProperty(location) &&
              locationNames[location].includes(config.name)
            ) {
              throw new Error(
                `Duplicate directive "@${config.name}" defined in module ${module.id}`
              );
            }
            if (!locationNames.hasOwnProperty(location)) {
              locationNames[location] = [];
            }
            locationNames[location].push(config.name);
          });

          directives.push(
            new GraphQLDirective({
              name: config.name,
              description: config.description,
              locations: config.locations,
              isRepeatable: config.isRepeatable,
              ...(config.arguments
                ? { args: this.resolveArgumentConfigMap(config.arguments) }
                : {}),
            })
          );
        });
      }
    });
    return directives;
  }

  /**
   * Returns the directive for a given location
   * @param name
   * @param location
   * @returns {T}
   */
  getDirective(
    name: string,
    location: DirectiveLocationEnum
  ): GraphQLDirective {
    const found = this._directives.find((directive) => {
      return directive.name === name && directive.locations.includes(location);
    });
    if (!found) {
      throw new Error(`Directive @${name} was not found in schema builder`);
    }
    return found;
  }

  /**
   * Returns the executor that runs the function
   *
   * @param module
   * @param functionName
   * @private
   */
  _getFunctionHandler(
    module: ModuleConfig,
    functionName: string
  ): FunctionHandler {
    // Check if handler is cached and return in case
    let handler;
    let appHandlerMap = this._functionHandlers.get(module);
    if (appHandlerMap && appHandlerMap.get(functionName)) {
      handler = appHandlerMap.get(functionName);
      if (handler) {
        return handler;
      }
    }

    if (!module.functions || !module.functions.hasOwnProperty(functionName)) {
      throw new UserError(
        `The function handler "${functionName}" was not found in app "${module.id}"`
      );
    }

    const functionConfig = module.functions[functionName];
    switch (functionConfig.kind) {
      case FunctionKind.HTTP: {
        handler = async (payload: any) => {
          try {
            return await fetch(functionConfig.url, {
              method: functionConfig.method || 'POST',
              headers: {
                ...(functionConfig.headers || {}),
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              redirect: 'follow',
              follow: 3,
              timeout: 15000,
              body: JSON.stringify(payload),
            });
          } catch (e) {
            throw new UserError(
              `Error executing listener function ${functionName}: ${e.message}`
            );
          }
        };
        break;
      }
      case FunctionKind.NATIVE: {
        handler = functionConfig.execute;
        break;
      }
      case FunctionKind.RUNTIME: {
        handler = async (payload: any, context: Context) => {
          // Check if we have deployment for module
          const runtime = await context.getRuntime(module.id);

          const result = await runtime.execute(
            functionConfig.handler,
            payload,
            context.getRuntimeExecutionContext(module.id)
          );
          if (result.success) {
            return result.data;
          }
          throw new UserError(result.message);
        };
        break;
      }
      default: {
        throw new Error('Invalid function handler kind in function config');
      }
    }

    // Cache function
    if (!appHandlerMap) {
      appHandlerMap = new Map();
      this._functionHandlers.set(module, appHandlerMap);
    }
    appHandlerMap.set(functionName, handler);

    return handler;
  }

  /**
   * Returns the app that the provided app is part of
   *
   * @param obj
   * @private
   */
  _getModule(obj: any): ModuleConfig {
    const app = this._objectModuleMap.get(obj);
    if (!app) {
      throw new Error(
        'Module not found for object. Object was not stored in objectModuleMap'
      );
    }
    return app;
  }

  /**
   * Returns the (generated) input type name for the mutation $input arg
   * @param mutationName
   * @private
   */
  _getMutationInputTypeName(mutationName: string): string {
    return `${mutationName}Input`;
  }
}

export default SchemaBuilder;
