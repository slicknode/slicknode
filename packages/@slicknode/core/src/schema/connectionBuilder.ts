/**
 * Created by Ivo Meißner on 18.01.17.
 *
 */

import {
  FieldConfig,
  FieldConfigMap,
  ConnectionConfig,
  ObjectTypeConfig,
  TypeConfigMap,
  ArgumentConfigMap,
  TypeConfig,
  ConnectionLoaderArgs,
  EnumTypeConfig,
  ConnectionConfigMap,
  HandlerConfig,
  isContent,
  InputObjectTypeConfig,
  TypeKind,
  isNode,
  isEnumTypeConfig,
} from '../definition';

import { FieldAccess } from '../definition';

import { GraphQLResolveInfo } from 'graphql';

import _ from 'lodash';

import Context from '../context';

import { getHandler } from './handler/index';
import { CONNECTION_NODES_DEFAULT } from '../config';

import { getListAllConnectionName, getTypeFilterName } from './identifiers';

import DataLoader from 'dataloader';

/**
 * Returns the graphQL type name for the connection edge
 * @param config
 * @returns {string}
 */
function getConnectionEdgeName(config: ConnectionConfig): string {
  return (
    '_' +
    config.node.typeName +
    'Edge' +
    (config.edge.typeName ? '_with' + config.edge.typeName + 'Edge' : '')
  );
}

/**
 * Returns the name for the connection type
 * @param config
 * @returns {string}
 */
function getConnectionName(config: ConnectionConfig): string {
  return (
    '_' +
    config.node.typeName +
    'Connection' +
    (config.edge.typeName ? '_with' + config.edge.typeName + 'Edge' : '')
  );
}

/**
 * Returns the name for the filter input object
 * @param config
 * @returns {string}
 */
function getConnectionFilterName(config: ConnectionConfig): string {
  return getConnectionName(config) + 'Filter';
}

/**
 * Returns the name for the order input object
 * @param config
 */
function getConnectionSortName(config: ConnectionConfig): string {
  return getConnectionName(config) + 'Order';
}

/**
 * Returns the name of the enum type for all sortable fields
 * @param typeName
 */
function getTypeSortableFieldName(typeName: string): string {
  return `_${typeName}SortableField`;
}

/**
 * Argument configs for forward pagination
 * @type {[*]}
 */
const forwardConnectionArgs: ArgumentConfigMap = {
  first: {
    typeName: 'Int',
  },
  after: {
    typeName: 'String',
  },
};

/**
 * Argument configs for backward pagination
 * @type {Array}
 */
const backwardConnectionArgs: ArgumentConfigMap = {
  last: {
    typeName: 'Int',
  },
  before: {
    typeName: 'String',
  },
};

/**
 * Arguments for connections of content nodes
 */
const contentArgs: ArgumentConfigMap = {
  preview: {
    typeName: 'Boolean',
    description: 'Return nodes in preview status',
  },
  locale: {
    typeName: 'String',
    description:
      'ISO 639-1 locale code. Uses locale of parent node if not provided',
  },
};

/**
 * Transforms the connection config to the field config
 * @param config
 * @param typeMap
 */
export function connectionConfigToFieldConfig(
  config: ConnectionConfig,
  typeMap: TypeConfigMap
): FieldConfig {
  const isOneToOne = isOneToOneRelation(config, typeMap);
  const nodeType = typeMap[config.node.typeName];
  const isContentType = isContent(nodeType);

  const fieldConfig: FieldConfig = {
    typeName: isOneToOne ? config.node.typeName : getConnectionName(config),
    required: false, // !isOneToOne,
    description: config.description,
    deprecationReason: config.deprecationReason,

    /**
     * Calculates the complexity of the connection
     */
    complexity(options: {
      args: {
        [x: string]: any;
      };
      childComplexity: number;
    }): number {
      const { childComplexity, args } = options;
      if (isOneToOne) {
        return 1 + childComplexity;
      }

      let multiplier: number = CONNECTION_NODES_DEFAULT;
      if (args.first || args.last) {
        multiplier = Math.max(
          Number(args.first) || 0,
          Number(args.last) || 0,
          1
        );
      }

      return 1 + multiplier * childComplexity;
    },

    /**
     * An array of input arguments for the field
     */
    arguments: isOneToOne
      ? {
          ...(isContentType ? contentArgs : {}),
        }
      : {
          ...forwardConnectionArgs,
          ...backwardConnectionArgs,
          skip: {
            typeName: 'Int',
            description:
              'The number of items to skip in the result set, for page based pagination',
          },
          filter: {
            typeName: getConnectionFilterName(config),
          },
          orderBy: {
            typeName: getConnectionSortName(config),
          },
          ...(isContentType ? contentArgs : {}),
        },

    /**
     * A resolve function for the field. If not provided, default resolver will be used for given type
     */
    resolve: (
      source: {
        [x: string]: any;
      },
      args: {
        [x: string]: any;
      },
      context: Context,
      info: GraphQLResolveInfo
    ) => {
      const loaderArgs: ConnectionLoaderArgs = {
        sourceKeyValue: _.get(
          source,
          config.source.keyField || (isContentType ? 'contentNode' : 'id')
        ),
        args,
      };

      // Set locale / preview setting if set via args
      if (args.hasOwnProperty('preview') && args.preview !== null) {
        context.setPreview(info.path, Boolean(args.preview));
      }
      if (args.hasOwnProperty('locale') && args.locale !== null) {
        context.setLocale(info.path, args.locale);
      }

      const preview = context.getPreview(info.path);
      const locale =
        config.name === '_localizations' ? null : context.getLocale(info.path);

      return context
        .getConnectionLoader(config, preview, locale)
        .load(loaderArgs);
    },
  };
  return fieldConfig;
}

/**
 * Checks if the connection is a 1:1 connection
 *
 * @param config
 * @param typeMap
 */
export function isOneToOneRelation(
  config: ConnectionConfig,
  typeMap: TypeConfigMap
): boolean {
  // If we have unfiltered results
  if (!config.edge.sourceField) {
    return false;
  }

  // Check if we have edge type
  if (config.edge.typeName) {
    if (!typeMap.hasOwnProperty(config.edge.typeName)) {
      throw new Error(
        'Type for connection edge not found: ' + (config.edge.typeName || '')
      );
    }

    const edgeType = typeMap[config.edge.typeName];

    if (edgeType.kind === TypeKind.OBJECT) {
      // If both sourceField and nodeField are unique on edge type, we have 1:1
      return (
        // edgeType.fields[config.edge.nodeField].unique &&
        edgeType.fields[config.edge.sourceField].unique
      );
    }

    return false;
  }

  // If the sourceField on node is unique, we have 1:1
  if (!typeMap.hasOwnProperty(config.node.typeName)) {
    throw new Error(
      'Type for connection node not found: ' + (config.node.typeName || '')
    );
  }
  const nodeType = typeMap[config.node.typeName];
  if (nodeType.kind === TypeKind.OBJECT) {
    return nodeType.fields[config.edge.sourceField].unique === true;
  }

  return false;
}

/**
 * Creates a new DataLoader instance for the connection
 * @param config
 * @param context
 * @param preview
 * @param locale
 */
export function createConnectionLoader(
  config: ConnectionConfig,
  context: Context,
  preview: boolean,
  locale: string | null
): DataLoader<any, any> {
  let handler: HandlerConfig;

  // Check if we have edge type
  if (config.edge.typeName) {
    handler = _.get(
      context,
      `schemaBuilder.typeConfigs.${config.edge.typeName}.handler`
    );
  } else {
    // Connection is stored inline in node
    handler = _.get(
      context,
      `schemaBuilder.typeConfigs.${config.node.typeName}.handler`
    );
  }
  if (!handler) {
    throw new Error(
      'No handler defined for connection field ' +
        config.source.typeName +
        '.' +
        config.name
    );
  }

  // Get field resolver from handler and resolve
  return getHandler(handler).getConnectionLoader(
    config,
    context,
    preview,
    locale
  );
}

/**
 * Returns the edge type config for the connection
 * @param config
 * @param typeConfigs
 */
export function connectionConfigToEdgeType(
  config: ConnectionConfig,
  typeConfigs: TypeConfigMap
): ObjectTypeConfig {
  let edgeFields = {};
  // Get fields from edge
  if (config.edge.typeName) {
    if (!typeConfigs.hasOwnProperty(config.edge.typeName)) {
      throw new Error(
        'ConnectionConfig error: TypeConfig for type ' +
          (config.edge.typeName || '') +
          ' not found'
      );
    }

    const typeConfig: ObjectTypeConfig = typeConfigs[
      config.edge.typeName
    ] as ObjectTypeConfig;
    edgeFields = _.omit(typeConfig.fields, [
      'node',
      'cursor',
      config.edge.sourceField || '',
      config.edge.nodeField || '',
    ]);
  }

  return {
    kind: TypeKind.OBJECT,
    name: getConnectionEdgeName(config),
    description: 'Edge',
    fields: {
      node: {
        typeName: config.node.typeName,
        required: true,
      },
      cursor: {
        typeName: 'String',
        required: true,
      },
      ...edgeFields,
    },
  };
}

/**
 * Returns the typeConfig for the connection type
 * @param config
 * @returns {{name: string, description: string, fields: [*,*]}}
 */
export function connectionConfigToConnectionType(
  config: ConnectionConfig
): ObjectTypeConfig {
  return {
    kind: TypeKind.OBJECT,
    name: getConnectionName(config),
    description: 'Connection',
    fields: {
      edges: {
        typeName: getConnectionEdgeName(config),
        required: true,
        list: true,
        complexity: 0,
      },
      pageInfo: {
        typeName: 'PageInfo',
        required: true,
        complexity: 0,
      },
      totalCount: {
        typeName: 'Decimal',
        required: false,
        description: 'The total number of nodes in the connection',
        complexity: 1,
      },
    },
  };
}

/**
 * Returns the typeConfig for the connection filter type
 * @param config
 */
export function connectionConfigToFilterType(
  config: ConnectionConfig
): InputObjectTypeConfig {
  return {
    kind: TypeKind.INPUT_OBJECT,
    name: getConnectionFilterName(config),
    description: 'Filter for the connection',
    fields: {
      node: {
        typeName: getTypeFilterName(config.node.typeName),
        required: false,
      },
      // @TODO: Add edge fields
    },
  };
}

/**
 * Returns the type config for the connection order type
 * @param config
 */
export function connectionConfigToOrderType(
  config: ConnectionConfig
): InputObjectTypeConfig {
  return {
    kind: TypeKind.INPUT_OBJECT,
    name: getConnectionSortName(config),
    description: 'Settings for sorting the connection',
    fields: {
      fields: {
        typeName: getTypeSortableFieldName(config.node.typeName),
        description: 'The field or fields that the nodes should be ordered by',
        required: true,
        list: true,
      },
      direction: {
        typeName: 'OrderDirection',
        description: 'The direction in which the nodes should be returned',
        defaultValue: 'ASC',
      },
    },
  };
}

/**
 * Returns the field config for the enum type that contains all sortable field names for the
 * given object type
 * @param config
 */
export function typeConfigToOrderFieldsType(
  config: ObjectTypeConfig
): EnumTypeConfig {
  const sortableTypes = ['DateTime', 'Float', 'Int', 'String', 'ID', 'Boolean'];

  return {
    kind: TypeKind.ENUM,
    name: getTypeSortableFieldName(config.name),
    description:
      'All fields that can be used for sorting the nodes of type ' +
      config.name,
    values: Object.keys(config.fields).reduce(
      (
        values: {
          [x: string]: any;
        },
        fieldName: string
      ) => {
        const fieldConfig = config.fields[fieldName];

        // Ignore fields without read access
        if (
          fieldConfig.access &&
          !fieldConfig.access.includes(FieldAccess.READ)
        ) {
          return values;
        }

        // Check if field is sortable
        if (sortableTypes.includes(fieldConfig.typeName) && !fieldConfig.list) {
          values[fieldName] = {
            description: fieldConfig.description,
            value: fieldName,
          };
        }
        return values;
      },
      {}
    ),
  };
}

/**
 * Creates the config for the connection on the Query type to retrieve all Nodes
 * of the ObjectTypeConfig type
 *
 * @param config
 */
export function listAllConnection(config: ObjectTypeConfig): ConnectionConfig {
  return {
    name: getListAllConnectionName(config.name),
    description: 'Returns all nodes of type ' + config.name,
    source: {
      typeName: 'Query',
    },
    edge: {
      sourceField: null,
    },
    node: {
      typeName: config.name,
    },
  };
}

/**
 * Creates a filter input type config for the given type
 * Returns NULL if no filter type could be generated
 * @param config
 * @param typeMap A TypeConfigMap of all existing TypeConfigs
 * @param connectionMap
 */
export function typeConfigToFilterType(
  config: TypeConfig,
  typeMap: TypeConfigMap,
  connectionMap: {
    [typeName: string]: ConnectionConfigMap;
  }
): InputObjectTypeConfig | undefined | null {
  const filterTypeName = getTypeFilterName(config.name);

  if (isNode(config)) {
    const fields: FieldConfigMap = {};
    // Add filter for actual type config fields
    _.forOwn(config.fields, (fieldConfig: FieldConfig, fieldName: string) => {
      // Ignore fields without read access
      if (
        fieldConfig.access &&
        !fieldConfig.access.includes(FieldAccess.READ)
      ) {
        return;
      }

      // Use builtin filter for core types
      if (
        ['String', 'Int', 'Float', 'DateTime', 'ID', 'Decimal'].includes(
          fieldConfig.typeName
        )
      ) {
        // Only non list values supported so far
        if (!fieldConfig.list) {
          fields[fieldName] = {
            typeName: fieldConfig.typeName + 'Filter',
            description: fieldConfig.description,
            required: false,
          };
        }
      } else if (fieldConfig.typeName === 'Boolean') {
        if (!fieldConfig.list) {
          fields[fieldName] = {
            typeName: 'Boolean',
            description: fieldConfig.description,
            required: false,
          };
        }
      } else {
        if (!typeMap.hasOwnProperty(fieldConfig.typeName)) {
          throw new Error('Type not found in TypeMap: ' + fieldConfig.typeName);
        }

        const fieldTypeConfig: TypeConfig = typeMap[fieldConfig.typeName];
        // Check if we have Enum or Node type
        if (isNode(fieldTypeConfig) || isEnumTypeConfig(fieldTypeConfig)) {
          fields[fieldName] = {
            typeName: getTypeFilterName(fieldConfig.typeName),
            description: fieldConfig.description,
            required: false,
          };
        }
      }
    });

    // Add fields for connections
    _.forOwn(
      connectionMap[config.name],
      (connectionConfig: ConnectionConfig) => {
        // @TODO: Check if the node and edge types support filtering (HANDLER_POSTGRES) and
        // don't add filter field in case

        // Check if is 1:1 connection
        fields[connectionConfig.name] = {
          typeName: isOneToOneRelation(connectionConfig, typeMap)
            ? getTypeFilterName(connectionConfig.node.typeName)
            : getConnectionFilterName(connectionConfig),
          description: connectionConfig.description,
          required: false,
        };
      }
    );

    // Add autocomplete field
    if (config.autoCompleteFields && config.autoCompleteFields.length) {
      /*
      fields['_autoComplete'] = {
        typeName: 'String',
        description:
          'Returns only nodes where the concatenated value of the autoComplete fields contains the provided string',
        required: false,
        deprecationReason: 'Renamed to _autocomplete',
      };
       */
      fields['_autocomplete'] = {
        typeName: 'String',
        description:
          'Returns only nodes where the concatenated value of the autoComplete fields contains the provided string',
        required: false,
      };
    }

    // We have no fields, so ignore filter
    if (!Object.keys(fields).length) {
      return null;
    }

    // Add AND filter
    fields['AND'] = {
      typeName: filterTypeName,
      description: 'Return nodes that match all of the provided conditions',
      required: false,
      list: [true],
    };
    // Add OR filter
    fields['OR'] = {
      typeName: filterTypeName,
      description:
        'Return nodes that match at least one of the provided conditions',
      required: false,
      list: [true],
    };

    return {
      kind: TypeKind.INPUT_OBJECT,
      name: filterTypeName,
      description: `The filter for objects of type ${config.name}`,
      fields,
    };
  } else if (config.kind === TypeKind.ENUM) {
    return {
      kind: TypeKind.INPUT_OBJECT,
      name: filterTypeName,
      description: `The filter for fields of type ${config.name}`,
      fields: {
        eq: {
          typeName: config.name,
          required: false,
          description: 'Field is equal to the provided value',
        },
        notEq: {
          typeName: config.name,
          required: false,
          description: 'Field is not equal to the provided value',
        },
        in: {
          typeName: config.name,
          required: false,
          list: true,
          description: 'Field value is equal to one of the given values',
        },
        notIn: {
          typeName: config.name,
          required: false,
          list: true,
          description: 'Field value is not equal to any of the given values',
        },
        gt: {
          typeName: config.name,
          required: false,
          description: 'Field is greater than the provided value',
        },
        gte: {
          typeName: config.name,
          required: false,
          description: 'Field is greater than or equal ot the provided value',
        },
        lt: {
          typeName: config.name,
          required: false,
          description: 'Field is less than the provided value',
        },
        lte: {
          typeName: config.name,
          required: false,
          description: 'Field is less than or equal ot the provided value',
        },
        isNull: {
          typeName: 'Boolean',
          required: false,
          description: 'Field has no value',
        },
      },
    };
  }
  return null;
}

/**
 * The TypeConfig for relay pagination info type
 * @type {{name: string, description: string, fields: [*]}}
 */
export const PageInfo: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'PageInfo',
  description: 'Information about pagination in a connection',
  fields: {
    hasNextPage: {
      typeName: 'Boolean',
      description: 'When paginating forwards, are there more items?',
      required: true,
    },
    hasPreviousPage: {
      typeName: 'Boolean',
      description: 'When paginating backwards, are there more items?',
      required: true,
    },
    startCursor: {
      typeName: 'String',
      description: 'When paginating backwards, the cursor to continue.',
    },
    endCursor: {
      typeName: 'String',
      description: 'When paginating forwards, the cursor to continue.',
    },
  },
};
