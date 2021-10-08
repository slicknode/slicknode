/**
 * Created by Ivo Meißner on 2019-07-04
 *
 */
import {
  ArgumentConfigMap,
  ConnectionConfig,
  EnumTypeConfig,
  EnumValueConfigMap,
  FieldConfig,
  FieldConfigMap,
  InputObjectTypeConfig,
  InterfaceTypeConfig,
  ModuleConfig,
  ObjectTypeConfig,
  TypeConfig,
} from '../definition';
import {
  makeRemoteExecutableSchema,
  transformSchema,
  RenameTypes,
  RenameRootFields,
  MergeInfo,
} from 'graphql-tools';
import Context from '../context';
import fetch from 'node-fetch';
import {
  assertOutputType,
  FieldNode,
  FragmentSpreadNode,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLObjectTypeConfig,
  InlineFragmentNode,
  Kind,
  print,
  SelectionNode,
} from 'graphql';
import {
  GraphQLArgument,
  GraphQLEnumValue,
  GraphQLField,
  GraphQLType,
  DocumentNode,
  GraphQLFieldResolver,
  GraphQLOutputType,
  GraphQLResolveInfo,
  SelectionSetNode,
} from 'graphql';
import {
  getNamedType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  isListType,
  isNonNullType,
  isLeafType,
} from 'graphql';
import * as TypeKinds from '../definition/TypeKind';
import _ from 'lodash';
import { builtInTypes } from './builder';
import { deepReplaceVariables } from '../utils/object';
import { CACHE_MIN_AGE, CACHE_REMOTE_DATA_DEFAULT_AGE } from '../config';
import { RemoteApiError } from '../errors';

export type FetcherOperation = {
  query: DocumentNode;
  operationName?: string;
  variables?: {
    [key: string]: any;
  };
  context?: {
    graphqlContext: Context;
  };
};

/**
 * Create fetcher for remote GraphQL module
 * @param moduleConfig
 * @returns {function(FetcherOperation)}
 */
function createFetcher(moduleConfig: ModuleConfig) {
  return async (operation: FetcherOperation) => {
    // Replace variables in config
    const context = operation.context && operation.context.graphqlContext;
    if (!context) {
      throw new Error('No GraphQL execution context available');
    }
    const remoteModule = deepReplaceVariables({
      source: moduleConfig.remoteModule || {},
      variables: {
        settings: context.getModuleSettings(moduleConfig.id),
        request: {
          ip: context.req.ip,
          // headers: context.req.headers, @TODO: Only pass headers that don't leak secure info (auth headers)
        },
      },
    });

    const config = {
      method: 'POST',
      body: JSON.stringify({
        query: print(operation.query),
        variables: operation.variables || {},
        ...(operation.operationName
          ? { operationName: operation.operationName }
          : {}),
      }),
      headers: {
        ...(remoteModule.headers || {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };

    // Set surrogate cache max age
    if (context.surrogateCache) {
      context.surrogateCache.setMaxAge(
        Math.max(
          _.get(remoteModule, 'cache.maxAge', CACHE_REMOTE_DATA_DEFAULT_AGE),
          CACHE_MIN_AGE
        )
      );
    }

    try {
      const result = await fetch(remoteModule.endpoint, config);
      return await result.json();
    } catch (e) {
      return {
        data: null,
        errors: [
          {
            message: `Error loading data from remote GraphQL API ${remoteModule.endpoint}: ${e.message}`,
          },
        ],
      };
    }
  };
}

/**
 * Returns a new module config where the configs of fields / types etc. of the remote GraphQL API are added.
 * Existing types remain unchanged
 *
 * @param config
 * @param modules
 * @returns {ModuleConfig}
 */
export default function buildRemoteModule(
  config: ModuleConfig,
  modules: Array<ModuleConfig>
): ModuleConfig {
  if (config.remoteModule) {
    const newConfig = {
      ...config,
    };
    let schema = makeRemoteExecutableSchema({
      schema: config.rawSchema,
      fetcher: createFetcher(config),
    });
    schema = transformSchema(schema, [
      new RenameTypes((name) =>
        config.namespace ? `${config.namespace}_${name}` : name
      ),
      new RenameRootFields((operation, name) =>
        config.namespace ? `${config.namespace}_${name}` : name
      ),
    ]);

    const mutationType = schema.getMutationType();
    const queryType = schema.getQueryType();
    const subscriptionType = schema.getSubscriptionType();

    const typeMap = schema.getTypeMap();

    // Add types
    newConfig.types = [
      ...(config.types || []),
      ...Object.keys(schema.getTypeMap())
        .filter(
          (name) =>
            !name.startsWith('__') && !Object.keys(builtInTypes).includes(name)
        )
        .map((name) => typeMap[name])
        .filter(
          (type) =>
            ![mutationType, queryType, subscriptionType].includes(type as any)
        )
        .map(typeToTypeConfig),
    ];
    const typeNames = newConfig.types.map((type) => type.name);

    // Generate mergeInfo
    const fragments = [];
    modules.forEach((moduleConfig) => {
      if (moduleConfig.connections) {
        moduleConfig.connections.forEach((connection) => {
          if (connection.source) {
            if (typeNames.includes(connection.source.typeName)) {
              let typeName = connection.source.typeName;
              // Remove namespace prefix for fragment type name, bcs we use namespace of remote schema
              if (config.namespace) {
                typeName = typeName.substring(config.namespace.length + 1);
              }

              fragments.push({
                field: connection.name,
                fragment: `... on ${typeName} { ${
                  connection.source.keyField || 'id'
                } }`,
              });
            }
          }
        });
      }
    });

    // Add query fields
    newConfig.typeExtensions = {
      Query: _.mapValues(queryType.getFields(), (field) => {
        let fieldConfig = fieldToFieldConfig(field);
        if (fragments.length) {
          fieldConfig = {
            ...fieldConfig,
            resolve: extendedRootResolver(fieldConfig.resolve, fragments),
          };
        }
        return fieldConfig;
      }) as FieldConfigMap,
    };

    // Add mutations
    if (mutationType) {
      newConfig.mutations = _.values(mutationType.getFields()).map(
        (field: GraphQLField<any, any>) => {
          let fieldConfig = fieldToFieldConfig(field);
          if (fragments.length) {
            fieldConfig = {
              ...fieldConfig,
              resolve: extendedRootResolver(fieldConfig.resolve, fragments),
            };
          }
          return {
            name: field.name,
            description: field.description,
            deprecationReason: field.deprecationReason,
            field: fieldConfig,
            fields: {},
            permissions: [],
            inputFields: {},
          };
        }
      );
    }

    return newConfig;
  }
  return config;
}

function typeToTypeConfig(type: GraphQLType): TypeConfig {
  if (type instanceof GraphQLObjectType) {
    const objectTypeConfig: ObjectTypeConfig = {
      kind: TypeKinds.TypeKind.OBJECT,
      name: type.name,
      description: type.description,
      interfaces: type
        .getInterfaces()
        .map((interfaceType) => interfaceType.name),
      fields: _.mapValues(
        type.getFields(),
        fieldToFieldConfig
      ) as FieldConfigMap,
    };
    return objectTypeConfig;
  } else if (type instanceof GraphQLInterfaceType) {
    const interfaceTypeConfig: InterfaceTypeConfig = {
      kind: TypeKinds.TypeKind.INTERFACE,
      name: type.name,
      description: type.description,
      fields: _.mapValues(
        type.getFields(),
        fieldToFieldConfig
      ) as FieldConfigMap,
      resolveType: type.resolveType,
    };
    return interfaceTypeConfig;
  } else if (type instanceof GraphQLUnionType) {
    return {
      kind: TypeKinds.TypeKind.UNION,
      name: type.name,
      description: type.description,
      typeNames: type.getTypes().map((t) => t.name),
    };
  } else if (type instanceof GraphQLInputObjectType) {
    const inputObjectTypeConfig: InputObjectTypeConfig = {
      kind: TypeKinds.TypeKind.INPUT_OBJECT,
      name: type.name,
      description: type.description,
      fields: (_.mapValues(
        type.getFields(),
        fieldToFieldConfig
      ) as unknown) as FieldConfigMap,
    };
    return inputObjectTypeConfig;
  } else if (type instanceof GraphQLEnumType) {
    const enumTypeConfig: EnumTypeConfig = {
      kind: TypeKinds.TypeKind.ENUM,
      name: type.name,
      description: type.description,
      values: type
        .getValues()
        .reduce((values: EnumValueConfigMap, value: GraphQLEnumValue) => {
          values[value.name] = {
            value: value.value,
            description: value.description,
            deprecationReason: value.deprecationReason,
          };
          return values;
        }, {}),
    };
    return enumTypeConfig;
  } else if (type instanceof GraphQLScalarType) {
    return {
      kind: TypeKinds.TypeKind.SCALAR,
      name: type.name,
      description: type.description,
      type,
    };
  }

  throw new Error(`Unknown type ${type}`);
}

function unwrapType(
  type: GraphQLType
): {
  required: boolean;
  list: boolean | Array<boolean>;
  typeName: string;
} {
  let list: boolean | boolean[] = false;
  let required = false;
  let currentType = type;
  if (isNonNullType(type)) {
    required = true;
    currentType = type.ofType;
  }
  while (isListType(currentType)) {
    let innerRequired = false;
    if (isNonNullType(currentType.ofType)) {
      innerRequired = true;
      currentType = currentType.ofType.ofType;
    } else {
      currentType = currentType.ofType;
    }

    if (!list) {
      list = [];
    }
    list.push(innerRequired);
  }
  if (list) {
    list.reverse();
  }

  return {
    typeName: getNamedType(type).name,
    required,
    list,
  };
}

function fieldToFieldConfig(field: GraphQLField<any, any>): FieldConfig {
  const resolve = field.resolve;

  return {
    description: field.description,
    ...(field.deprecationReason
      ? { deprecationReason: field.deprecationReason }
      : {}),
    ...unwrapType(field.type),
    ...(field.args
      ? {
          arguments: field.args.reduce(
            (map: ArgumentConfigMap, arg: GraphQLArgument) => {
              map[arg.name] = {
                description: arg.description,
                ...unwrapType(arg.type),
              };
              return map;
            },
            {}
          ),
        }
      : {}),
    ...(resolve ? { resolve } : {}),
  };
}

/**
 * Creates a new field resolver that also load data dependencies (for connections for example). The dependent
 * fields are added to the selection set and passed to the original resolver
 *
 * @param resolver
 * @param fragments
 */
function extendedRootResolver(
  resolver: GraphQLFieldResolver<any, any>,
  fragments: Array<{
    field: string;
    fragment: string;
  }>
): GraphQLFieldResolver<any, any> {
  return async (
    source: any,
    args: any,
    context: Context,
    info: GraphQLResolveInfo & { mergeInfo?: MergeInfo }
  ) => {
    const extendedInfo = {
      ...info,
      mergeInfo: {
        ...(info.mergeInfo ? info.mergeInfo : {}),
        fragments,
      },
      operation: {
        ...info.operation,
        selectionSet: extendSelectionSet({
          selectionSet: info.operation.selectionSet,
          context,
          type: info.parentType,
        }),
      },
    };

    // Catch error so we can expose remote API error to user with RemoteApiError
    try {
      return await Promise.resolve(
        resolver(source, args, context, extendedInfo)
      );
    } catch (e) {
      throw new RemoteApiError(e.message);
    }
  };
}

function extendSelectionSet(options: {
  selectionSet: SelectionSetNode;
  type: GraphQLOutputType;
  context: Context;
}): SelectionSetNode {
  const { selectionSet, type, context } = options;

  const loadedFields = selectionSet.selections
    .filter((selection) => selection.kind === Kind.FIELD)
    .map((selection) => (selection as FieldNode).name.value);

  // Recursively extend selection set
  const selections = selectionSet.selections.map((selection) => {
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      let fragmentType = type;
      if (selection.typeCondition) {
        fragmentType = assertOutputType(
          context.schemaBuilder
            .getSchema()
            .getType(selection.typeCondition.name.value)
        );
      }
      return {
        ...selection,
        selectionSet: extendSelectionSet({
          selectionSet: selection.selectionSet,
          type: fragmentType,
          context,
        }),
      };
    } else if (
      !isLeafType(type) &&
      selection.kind === Kind.FIELD &&
      selection.selectionSet
    ) {
      // @FIXME: Check if this works for union types and fix types accordingly
      const returnType = (getNamedType(type) as any).getFields()[
        selection.name.value
      ].type;
      return {
        ...selection,
        selectionSet: extendSelectionSet({
          selectionSet: selection.selectionSet,
          type: returnType,
          context,
        }),
      };
    }

    return selection;
  });

  // Check if any of those are connections
  const namedType = getNamedType(type);
  loadedFields.filter((field) => {
    const connectionConfig: ConnectionConfig = (_.get(
      context.schemaBuilder.connectionConfigs,
      `${namedType.name}.${field}`
    ) as unknown) as ConnectionConfig | null;
    if (connectionConfig) {
      const keyField: string = connectionConfig.source.keyField;

      // Add inline fragment for dependencies
      const fragmentNode: InlineFragmentNode = {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: namedType.name,
          },
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: keyField,
              },
            },
          ] as ReadonlyArray<SelectionNode>,
        },
      };
      selections.push(fragmentNode);
    }
  });

  return {
    ...selectionSet,
    selections,
  } as SelectionSetNode;
}
