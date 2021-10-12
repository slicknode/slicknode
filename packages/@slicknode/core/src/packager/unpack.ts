/**
 * Created by Ivo Meißner on 10.09.17.
 *
 */

import {
  ASTNode,
  DirectiveLocation,
  EnumTypeDefinitionNode,
  EnumValueDefinitionNode,
  FieldDefinitionNode,
  getDirectiveValues,
  GraphQLSchema,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  parse,
  UnionTypeDefinitionNode,
  validate,
} from 'graphql';

import { HANDLER_POSTGRES } from '../schema/handler';
import AdmZip from 'adm-zip';

import {
  ArgumentConfig,
  ArgumentConfigMap,
  ConnectionConfig,
  EnumTypeConfig,
  EnumValueConfig,
  EnumValueConfigMap,
  FieldAccess,
  FieldConfig,
  FieldConfigMap,
  FunctionConfigMap,
  FunctionKind,
  InputObjectTypeConfig,
  RFDefinitionKind,
  ModuleConfig,
  ModuleKind,
  ModuleRuntime,
  MutationConfig,
  ObjectTypeConfig,
  PostMutationHook,
  PreMutationHook,
  RFDefinition,
  TypeKind,
  UnionTypeConfig,
  ObjectTypePermissionSet,
  PageKind,
} from '../definition';

import _ from 'lodash';
import {
  app as appSchema,
  config as configSchema,
} from './validation/configSchemas';
import { PackageError } from '../errors';
import { tenantModules } from '../modules';
import * as Constants from './validation/constants';
import yaml from 'js-yaml';
import { unCamelCase } from '../utils/string';
import parsePermissionDocument from '../auth/parsePermissionDocument';
import { createPermissionQuerySchema, Role } from '../auth';
import { getDirective, RELATION_PATH_REGEX } from './directives';
import SchemaBuilder from '../schema/builder';
import Node from '../modules/relay/types/Node';
import Content from '../modules/content/types/Content';
import validateProject from '../validation/project';
import { ResolverConfigMap } from '../definition/ResolverConfig';
import { getArgumentValues } from 'graphql/execution/values';
import { IndexDirective } from '../modules/core/directives/IndexDirective';
import { AutocompleteDirective } from '../modules/core/directives/AutocompleteDirective';

const RELATION_DIRECTIVE_NAME = 'relation';

const RUNTIME_IGNORED_FILES = [
  '.gitignore',
  'schema.graphql',
  'slicknode.yml',
  'permissions/*',
];

type UnpackedModule = {
  /**
   * The unpacked module config
   */
  module: ModuleConfig;
  /**
   * TypePermissions for types in other modules
   * for processing / validation in complete project context
   */
  typePermissions: Array<{
    /**
     * The type name
     */
    typeName: string;
    /**
     * The GraphQL permission document
     */
    document: string;
  }>;
};

/**
 * Unpacks a project archive and returns NOT VALIDATED modules.
 * They first have to pass validation to be further used.
 *
 * @param zip
 * @returns {Promise.<{modules: Array, errors: Array}>}
 */
async function unpack(
  zip: AdmZip
): Promise<{ modules: ModuleConfig[]; errors: PackageError[] }> {
  let modules = [];
  const errors = [];
  let config;

  try {
    // Get and validate config
    const rawConfig = zip.readAsText('slicknode.yml');
    if (!rawConfig) {
      throw new PackageError('Package has no slicknode.yml file');
    }
    try {
      config = yaml.safeLoad(rawConfig);
    } catch (e) {
      throw new PackageError(`Could not parse slicknode.yml: ${e.message}`);
    }
    const result = configSchema.validate(config, {
      abortEarly: false,
    });
    if (result.error) {
      const childErrors = (result.error.details || [])
        .map((detail) => {
          return `Invalid value at path "${detail.path}": ${detail.message}`;
        })
        .join('\n');
      throw new PackageError(
        `Invalid values in slicknode.yml configuration: \n${childErrors}`
      );
    }

    // Add modules
    const appResolvers = Object.keys(config.dependencies).map(
      async (name: string) => {
        if (name.match(Constants.PUBLIC_MODULE_NAME_REGEX)) {
          for (let i = 0; i < tenantModules.length; i++) {
            if (tenantModules[i].id === name) {
              return { module: tenantModules[i] };
            }
          }

          throw new PackageError(`Unknown module "${name}" in slicknode.yml`);
        } else if (name.match(Constants.PRIVATE_MODULE_NAME_REGEX)) {
          return await unpackModule(name, zip);
        }

        throw new PackageError('Invalid module name');
      }
    );
    const unpackedModules = await Promise.all(appResolvers);
    const validationErrors = validateProject(
      unpackedModules.map((u) => u.module),
      []
    );

    if (validationErrors && validationErrors.length) {
      const lastError = validationErrors.pop();
      errors.push(...validationErrors);
      throw lastError;
    }

    // Build schema to retrieve a complete typeMap with merged fields from modules
    const builder = new SchemaBuilder({
      modules: unpackedModules.map((m) => m.module),
    });

    // Cached map of permission schemas
    const permissionSchemas: {
      [typeName: string]: GraphQLSchema;
    } = {};

    // Add typePermissions to module configurations
    modules = unpackedModules.map((unpackedModule: UnpackedModule) => {
      // Add type permissions to module
      if (
        unpackedModule.typePermissions &&
        unpackedModule.typePermissions.length
      ) {
        // Merge permissions into one
        const typePermissions = unpackedModule.typePermissions.reduce(
          (tempPermissions, permission) => {
            if (!builder.typeConfigs.hasOwnProperty(permission.typeName)) {
              throw new PackageError(
                `Permissions for type "${permission.typeName}" were defined in module "${unpackedModule.module.id}" ` +
                  'but the type does not exist in your project. Remove the obsolete permission document.'
              );
            }

            // Validate permission document against permission schema
            if (!permissionSchemas.hasOwnProperty(permission.typeName)) {
              permissionSchemas[permission.typeName] =
                createPermissionQuerySchema(
                  builder.getSchema(),
                  builder.getObjectTypeConfig(permission.typeName)
                );
            }

            const schemaErrors = validate(
              permissionSchemas[permission.typeName],
              parse(permission.document)
            );

            if (schemaErrors.length) {
              throw new PackageError(
                `Invalid permission query document for type "${permission.typeName}" ` +
                  `in module "${
                    unpackedModule.module.id
                  }": ${schemaErrors[0].toString()}`
              );
            }

            // Parse document into permissions
            tempPermissions[permission.typeName] = parsePermissionDocument(
              permission.document,
              builder.getObjectTypeConfig(permission.typeName)
            );

            return tempPermissions;
          },
          {}
        );

        return {
          ...unpackedModule.module,
          typePermissions,
        };
      }

      return unpackedModule.module;
    });
  } catch (e) {
    if (e instanceof PackageError) {
      errors.push(e);
    } else {
      console.error(`Error unpacking project: ${e.message}`);
      errors.push(
        new PackageError(
          'Error unpacking project. Please file an issue on github with the schema that causes this error.'
        )
      );
    }
  }

  return {
    modules,
    errors,
  };
}

/**
 * Unpacks the given app from the Zip archive, rejects with PackageError
 * if could not unpack
 *
 * @param name
 * @param zip
 * @returns {Promise.<void>}
 */
async function unpackModule(
  name: string,
  zip: AdmZip
): Promise<UnpackedModule> {
  const rawConfig = zip.readAsText(`modules/${name}/slicknode.yml`);
  if (!rawConfig) {
    throw new PackageError(`Module "${name}" does not have a slicknode.yml`);
  }
  let config;
  try {
    config = yaml.safeLoad(rawConfig);
  } catch (e) {
    throw new PackageError(
      `Could not parse slicknode.yml for app "${name}": ${e.message}`
    );
  }
  const result = appSchema.validate(config, {
    abortEarly: false,
  });
  if (result.error) {
    const childErrors = (result.error.details || [])
      .map((detail) => {
        return `Invalid value at path "${detail.path}": ${detail.message}`;
      })
      .join('\n');
    throw new PackageError(
      `Invalid values in slicknode.yml configuration: \n${childErrors}`
    );
  }

  // If we have runtime config, create source bundle
  let runtime: ModuleRuntime;
  if (config.runtime) {
    runtime = {
      config: config.runtime,
    };
  }

  // Convert listeners, resolvers to functions + remoteFunction config
  const functions: FunctionConfigMap = {};
  const listeners: Array<RFDefinition> = [];
  const resolvers: ResolverConfigMap = {};

  // Convert resolvers
  if (config.resolvers) {
    _.forOwn(config.resolvers, (fields, typeName) => {
      _.forOwn(config.resolvers[typeName], (resolverConfig, fieldName) => {
        // Create handler function config
        const internalHandlerName = `runtime:${resolverConfig.handler}`;
        if (!functions.hasOwnProperty(internalHandlerName)) {
          functions[internalHandlerName] = {
            kind: FunctionKind.RUNTIME,
            handler: resolverConfig.handler,
          };
        }

        // Add resolver config
        _.set(resolvers, `${typeName}.${fieldName}`, {
          handler: internalHandlerName,
        });
      });
    });
  }

  // Convert listeners
  if (config.listeners && config.listeners.length) {
    config.listeners.forEach((listenerConfig) => {
      // Create handler function config
      const internalHandlerName = `runtime:${listenerConfig.handler}`;
      if (!functions.hasOwnProperty(internalHandlerName)) {
        functions[internalHandlerName] = {
          kind: FunctionKind.RUNTIME,
          handler: listenerConfig.handler,
        };
      }

      const eventParts = listenerConfig.event.split('.');
      switch (eventParts[0]) {
        case 'mutation': {
          switch (eventParts[2]) {
            case 'AFTER': {
              const postMutationHook: PostMutationHook = {
                kind: RFDefinitionKind.POST_MUTATION,
                mutationName: String(eventParts[1]),
                query: _.get(listenerConfig, 'config.query', null),
                handler: internalHandlerName,
              };
              listeners.push(postMutationHook);
              break;
            }
            case 'BEFORE': {
              const preMutationHook: PreMutationHook = {
                kind: RFDefinitionKind.PRE_MUTATION,
                mutationName: String(eventParts[1]),
                // /**
                //  * If set to true, the result data of the listener function is used as input for the next
                //  * function in the chain (or the mutation)
                //  * Functions with returnsInputData are processed serially.
                //  * The other functions are processed in parallel.
                //  */
                // returnsInputData?: boolean,
                //
                // /**
                //  * If true, a custom error message is passed
                //  */
                // returnsErrorMessage?: boolean,
                handler: internalHandlerName,
              };
              listeners.push(preMutationHook);
              break;
            }
            default: {
              throw new PackageError(
                `Unknown event name: ${listenerConfig.event}`
              );
            }
          }
          break;
        }
        default:
          throw new PackageError(`Unknown event name: ${listenerConfig.event}`);
      }
    });
  }

  // Build module config
  const appConfig: ModuleConfig = {
    kind: ModuleKind.DYNAMIC,
    rawConfig,
    id: result.value.module.id,
    namespace: result.value.module.namespace,
    types: [],
    mutations: [],
    connections: [],
    typeExtensions: {},
    resolvers: {},
    version: 'latest', // @TODO: Maybe add path here?
    admin: {
      base: {
        name: result.value.module.label,
        description: result.value.module.description || '',
        pages: [],
        types: {},
        mutations: {},
      },
    },
    ...(runtime ? { runtime } : {}),
    ...(listeners ? { listeners } : {}),
    ...(functions ? { functions } : {}),
    ...(Object.keys(resolvers).length ? { resolvers } : {}),
  };

  // Parse app schema.graphql if existent
  const typePermissions = [];
  const objectTypeMap = {};
  const rawSchema = zip.readAsText(`modules/${name}/schema.graphql`);
  if (rawSchema) {
    let ast;
    try {
      ast = parse(rawSchema);
      if (ast.kind !== Kind.DOCUMENT) {
        throw new Error('Schema has to be a valid GraphQL document');
      }
      // Only add type configurations for non remote modules
      if (!result.value.module.remote) {
        ast.definitions.forEach((definition) => {
          switch (definition.kind) {
            case Kind.OBJECT_TYPE_DEFINITION: {
              const objectTypeConfig = definitionToObjectTypeConfig(
                definition,
                resolvers
              );
              appConfig.types.push(objectTypeConfig);
              objectTypeMap[objectTypeConfig.name] = objectTypeConfig;

              // Add connections
              (definition.fields || [])
                // Filter all fields that don't have relation
                .filter((fieldDefinition) =>
                  (fieldDefinition.directives || []).some(
                    (directive) =>
                      directive.name.value === RELATION_DIRECTIVE_NAME
                  )
                )
                // Transform to connection config
                .map((fieldDefinition) =>
                  definitionToConnectionConfig(
                    fieldDefinition,
                    objectTypeConfig.name
                  )
                )
                // Add to app
                .forEach((connection) =>
                  appConfig.connections.push(connection)
                );

              // Add admin page
              // @TODO: This is where we can add custom admin configuration support later on
              // we just add default object type page here if is persistent node
              if ((objectTypeConfig.interfaces || []).includes('Node')) {
                appConfig.admin.base.pages.push({
                  name: unCamelCase(objectTypeConfig.name.split('_').pop()),
                  kind: PageKind.OBJECT_TYPE,
                  typeName: objectTypeConfig.name,
                });
              }

              break;
            }
            case Kind.OBJECT_TYPE_EXTENSION: {
              if (definition.interfaces && definition.interfaces.length) {
                throw new PackageError(
                  'Adding interfaces not supported in type extensions'
                );
              }
              if (definition.directives && definition.directives.length) {
                throw new PackageError(
                  'Directives not supported on type extensions'
                );
              }
              definition.fields.forEach((fieldDefinition) => {
                const isRelation = (fieldDefinition.directives || []).some(
                  (directive) =>
                    directive.name.value === RELATION_DIRECTIVE_NAME
                );
                if (isRelation) {
                  // Add connection
                  appConfig.connections.push(
                    definitionToConnectionConfig(
                      fieldDefinition,
                      definition.name.value
                    )
                  );
                } else if (definition.name.value === 'Mutation') {
                  // For mutation fields, add a mutation config instead
                  appConfig.mutations.push(
                    definitionToMutationConfig(fieldDefinition)
                  );
                } else {
                  // Add typeExtensions config
                  _.set(
                    appConfig,
                    `typeExtensions.${definition.name.value}.${fieldDefinition.name.value}`,
                    setFieldAccess({
                      fieldConfig: definitionToFieldConfig(fieldDefinition),
                      fieldName: fieldDefinition.name.value,
                      typeName: definition.name.value,
                      resolvers,
                    })
                  );
                }
              });
              break;
            }
            case Kind.ENUM_TYPE_DEFINITION: {
              const enumTypeConfig = definitionToEnumTypeConfig(definition);
              appConfig.types.push(enumTypeConfig);
              break;
            }
            case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
              const inputTypeConfig =
                definitionToInputObjectTypeConfig(definition);
              appConfig.types.push(inputTypeConfig);
              break;
            }
            case Kind.UNION_TYPE_DEFINITION: {
              const unionTypeConfig = definitionToUnionTypeConfig(definition);
              appConfig.types.push(unionTypeConfig);
              break;
            }
            default: {
              throw new PackageError(
                `Unsupported definition ${definition.kind} in schema.graphql of module "${name}"`
              );
            }
          }
        });
      }
    } catch (e) {
      throw new PackageError(
        `Could not parse schema.graphql of module "${name}": ${e.message}`
      );
    }
    // Store raw schema
    appConfig.rawSchema = rawSchema;
  }

  // Read remote schema if any
  if (result.value.module.remote) {
    if (!appConfig.rawSchema) {
      throw new PackageError(
        `Remote is configured for module "${name}" but no schema defined in schema.graphql`
      );
    }
    appConfig.remoteModule = {
      endpoint: result.value.module.remote.endpoint,
      headers: result.value.module.remote.headers || {},
    };
  }

  // Read settings if any
  const settingsEntry = zip.getEntry(`modules/${name}/settings.graphql`);

  if (settingsEntry) {
    const settingsSchema = settingsEntry.getData().toString('utf8');
    let settingsInput;
    let ast;
    try {
      ast = parse(settingsSchema);
      if (ast.kind !== Kind.DOCUMENT) {
        throw new Error('Settings schema has to be a valid GraphQL document');
      }
      ast.definitions.forEach((definition) => {
        switch (definition.kind) {
          case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
            if (settingsInput) {
              throw new Error(
                'There is only one InputObjectTypeDefinition allowed in settings.graphql'
              );
            }
            settingsInput = definitionToInputObjectTypeConfig(definition);
            break;
          }
          default: {
            throw new Error(
              `Only InputObjectTypeDefinitions are supported for settings schema, got ${definition.kind}.`
            );
          }
        }
      });
    } catch (e) {
      throw new PackageError(
        `Error parsing settings document of module "${name}": ${e.message}`
      );
    }

    if (settingsInput) {
      // Check if input values are supported
      Object.keys(settingsInput.fields).forEach((fieldName) => {
        const fieldConfig: FieldConfig = settingsInput.fields[fieldName];

        // Only allow nonList values
        if (fieldConfig.list) {
          throw new PackageError(
            'List values are not supported for settings. Use something like comma separated values instead ' +
              `for field ${fieldName}`
          );
        }

        // Check supported type names
        if (!['String', 'Float', 'Int'].includes(fieldConfig.typeName)) {
          throw new PackageError(
            'Settings only support values of type `String`, `Float` and `Int`. ' +
              `Found type ${fieldConfig.typeName} for settings value ${fieldName}`
          );
        }
      });

      appConfig.settings = settingsInput;
    }
  }

  // Read permission files
  const permissionMap = zip
    .getEntries()
    .filter(
      (entry) =>
        entry.entryName.startsWith(`modules/${name}/permissions/`) &&
        entry.entryName.endsWith('.graphql')
    )
    .map((entry) => {
      return {
        typeName: entry.entryName.split('/').pop().split('.')[0],
        document: entry.getData().toString('utf8'),
      };
    })
    .reduce((map, perm) => {
      // Ignore empty permission documents
      if (perm.document) {
        // Check if type exists in typemap of current module
        if (objectTypeMap.hasOwnProperty(perm.typeName)) {
          map[perm.typeName] = parsePermissionDocument(
            perm.document,
            objectTypeMap[perm.typeName]
          );
        } else {
          typePermissions.push({
            typeName: perm.typeName,
            document: perm.document,
          });
        }
      }
      return map;
    }, {});

  // Inject permissions into object type configs
  Object.keys(permissionMap).forEach((key) => {
    if (objectTypeMap.hasOwnProperty(key)) {
      // Merge permissions into type
      Object.assign(objectTypeMap[key], permissionMap[key]);
      /*
        throw new PackageError(
          `Permissions for type "${key}" were defined in module "${appConfig.id}" ` +
          'but the modules does not have an object type with that name. Remove the obsolete permission document.'
        );
        */
    }
  });

  // Add default permissions for types that don't have permissions file
  Object.keys(objectTypeMap)
    .filter(
      (key) =>
        !permissionMap.hasOwnProperty(key) &&
        (objectTypeMap[key].interfaces || []).includes('Node')
    )
    .forEach((key) => {
      Object.assign(objectTypeMap[key], DEFAULT_PERMISSIONS);
    });

  return {
    module: appConfig,
    typePermissions,
  };
}

/**
 * Converts UnionTypeDefinitionNode to UnionTypeConfig
 * @param def
 */
function definitionToUnionTypeConfig(
  def: UnionTypeDefinitionNode
): UnionTypeConfig {
  const config: UnionTypeConfig = {
    name: def.name.value,
    kind: TypeKind.UNION,
    typeNames: def.types.map((type) => type.name.value),
  };

  // Add description if any
  const description = getDescription(def);
  if (description) {
    config.description = description;
  }
  return config;
}

/**
 * Converts ObjectTypeDefinitionNode to ObjectTypeConfig
 * @param def
 * @param resolvers
 * @returns {{name: string}}
 */
function definitionToObjectTypeConfig(
  def: ObjectTypeDefinitionNode,
  resolvers: ResolverConfigMap
): ObjectTypeConfig {
  const config: ObjectTypeConfig = {
    name: def.name.value,
    kind: TypeKind.OBJECT,
    fields: def.fields
      // Filter all fields that are relations
      .filter(
        (fieldDefinition) =>
          !(fieldDefinition.directives || []).some(
            (directive) => directive.name.value === RELATION_DIRECTIVE_NAME
          )
      )
      .reduce((map: FieldConfigMap, field: FieldDefinitionNode) => {
        const fieldConfig = definitionToFieldConfig(field);
        if (fieldConfig) {
          map[field.name.value] = setFieldAccess({
            resolvers,
            fieldConfig,
            typeName: def.name.value,
            fieldName: field.name.value,
          });
        }
        return map;
      }, {}),
  };

  // Add description if any
  const description = getDescription(def);
  if (description) {
    config.description = description;
  }

  // Add interfaces
  if (def.interfaces && def.interfaces.length > 0) {
    config.interfaces = def.interfaces.map((interfaceDefinition) => {
      if (interfaceDefinition.kind !== Kind.NAMED_TYPE) {
        throw new PackageError('Can only implement named type interfaces');
      }
      return interfaceDefinition.name.value;
    });
  }
  // Add persistence layer handler if we have Node
  if ((config.interfaces || []).includes('Node')) {
    config.handler = {
      kind: HANDLER_POSTGRES,
    };
  }

  // Extend field configs for builtin interface fields
  if (config.interfaces) {
    // Make TimeStampedInterface fields readonly for mutations and add default value
    if (config.interfaces.includes('TimeStampedInterface')) {
      config.fields.createdAt.access = [FieldAccess.READ];
      config.fields.createdAt.defaultValue = 'now';
      config.fields.lastUpdatedAt.access = [FieldAccess.READ];
    }

    // Make Node ID field Readonly, add resolver
    if (config.interfaces.includes('Node')) {
      const idField = Node.fields.id;
      config.fields.id = {
        ...idField,
        description:
          (config.fields.id && config.fields.id.description) ||
          idField.description,
      };
    }

    // Set access for Content types
    if (config.interfaces.includes('Content')) {
      Object.keys(Content.fields).forEach((fieldName) => {
        config.fields[fieldName].access = Content.fields[fieldName].access;
        if (!config.fields[fieldName].description) {
          config.fields[fieldName].description =
            Content.fields[fieldName].description;
        }
      });
    }
  }

  // Process directives
  (def.directives || []).forEach((directiveDefinition) => {
    try {
      const directive = getDirective(
        directiveDefinition.name.value,
        DirectiveLocation.OBJECT
      );

      switch (directive.name) {
        case IndexDirective.name: {
          const values = getArgumentValues(directive, directiveDefinition);
          if (!config.indexes) {
            config.indexes = [];
          }
          config.indexes.push({
            ...(values.unique ? { unique: true } : {}),
            fields: values.fields || [],
          });
          break;
        }
        case AutocompleteDirective.name: {
          const values = getArgumentValues(directive, directiveDefinition);
          config.autoCompleteFields = values.fields;
          break;
        }
        default: {
          throw new Error('Directive not supported');
        }
      }
    } catch (e) {
      throw new PackageError(
        `Invalid directive "${directiveDefinition.name.value}" on type "${def.name.value}": ${e.message}`
      );
    }
  });

  return config;
}

/**
 * Converts ObjectTypeDefinitionNode to ObjectTypeConfig
 * @param def
 * @returns {{name: string}}
 */
function definitionToInputObjectTypeConfig(
  def: InputObjectTypeDefinitionNode
): InputObjectTypeConfig {
  const config: InputObjectTypeConfig = {
    name: def.name.value,
    kind: TypeKind.INPUT_OBJECT,
    fields: def.fields.reduce(
      (map: FieldConfigMap, field: InputValueDefinitionNode) => {
        const fieldConfig = inputValueDefinitionToFieldConfig(field);
        if (fieldConfig) {
          map[field.name.value] = fieldConfig;
        }
        return map;
      },
      {}
    ),
  };

  // Add description if any
  const description = getDescription(def);
  if (description) {
    config.description = description;
  }

  // Process directives
  (def.directives || []).forEach((directive) => {
    switch (directive.name.value) {
      default: {
        throw new PackageError(
          `Unknown directive "${directive.name.value}" on type "${def.name.value}"`
        );
      }
    }
  });

  return config;
}

/**
 * Transforms a field definition node to ConnectionConfig
 * @param def
 * @param typeName The name of the type where the connection field is added
 */
function definitionToConnectionConfig(
  def: FieldDefinitionNode,
  typeName: string
): ConnectionConfig {
  // Get relation directive
  const relationDirective = getDirective(
    RELATION_DIRECTIVE_NAME,
    DirectiveLocation.FIELD_DEFINITION
  );

  // Get relation directive values
  const relationNode = (def.directives || []).find(
    (directive) => directive.name.value === relationDirective.name
  );
  if (!relationNode) {
    throw new Error('No "@relation" directive found in field');
  }
  let values: { [p: string]: any } = {};
  try {
    values = getDirectiveValues(relationDirective, def, {});
  } catch (e) {
    throw new PackageError(
      `Invalid use of directive @relation on field "${def.name.value}" of type "${typeName}": ${e.message}`
    );
  }

  // Validate path format
  if (!values.path || !(values.path || '').match(RELATION_PATH_REGEX)) {
    throw new PackageError(
      `Invalid relation path format on field "${def.name.value}" of type "${typeName}": ` +
        `"${values.path}"`
    );
  }

  // Check if value starts with type name
  const parts = values.path.split('=');
  if (!parts[0].startsWith(typeName)) {
    throw new PackageError(
      `Invalid relation path format on field "${def.name.value}" of type "${typeName}": ` +
        `It has to start with "${typeName}"`
    );
  }

  // Build connection config
  const config: ConnectionConfig = {
    name: def.name.value,
    source: {
      typeName,
    },
    edge: {
      sourceField: null,
    },
    node: {
      typeName: '',
    },
  };

  // Set description
  const description = getDescription(def) || null;
  if (description) {
    _.set(config, 'description', description);
  }

  // Check if we have custom key field (not default ID)
  const sourceParts = parts[0].split('.');
  if (sourceParts.length > 1) {
    _.set(config, 'source.keyField', sourceParts[1]);
  }

  // Check how many edges we have
  const edgeParts = parts[1].split('.');
  if (parts.length === 3) {
    // We have custom edge type that connects the nodes
    config.edge = {
      sourceField: edgeParts[0],
      typeName: edgeParts[1],
      nodeField: edgeParts[2],
    };
    const nodeParts = parts[2].split('.');
    if (nodeParts.length > 1) {
      config.node = {
        typeName: nodeParts[nodeParts.length - 1],
        keyField: nodeParts[0],
      };
    } else {
      config.node = {
        typeName: nodeParts[nodeParts.length - 1],
      };
    }
  } else {
    config.edge = {
      sourceField: edgeParts[0],
    };
    config.node = {
      typeName: edgeParts[edgeParts.length - 1],
    };
  }

  return config;
}

/**
 * Converts AST input value definition to FieldConfig
 * @param def
 * @returns {Object}
 */
function inputValueDefinitionToFieldConfig(
  def: InputValueDefinitionNode
): FieldConfig | undefined | null {
  if (def.kind !== Kind.INPUT_VALUE_DEFINITION) {
    throw new PackageError(
      'Only supports input value definitions in input type'
    );
  }

  let currentTypeDef = def.type;
  const fieldConfig: FieldConfig = {
    typeName: '',
    required: false,
    list: false,
  };

  // Process directives
  (def.directives || []).forEach((directive) => {
    switch (directive.name.value) {
      case 'input':
        try {
          fieldConfig.inputElementType = getDirectiveValues(
            getDirective('input', DirectiveLocation.FIELD_DEFINITION),
            def,
            {}
          ).type;
        } catch (e) {
          throw new PackageError(
            `Invalid use of directive @input on field "${def.name.value}": ${e.message}`
          );
        }
        break;
      default: {
        throw new PackageError(
          `Unknown directive "${directive.name.value}" on field "${def.name.value}"`
        );
      }
    }
  });

  const description = getDescription(def);
  if (description) {
    fieldConfig.description = description;
  }
  while (currentTypeDef) {
    switch (currentTypeDef.kind) {
      case Kind.NAMED_TYPE:
        fieldConfig.typeName = currentTypeDef.name.value;
        currentTypeDef = null;
        break;
      case Kind.NON_NULL_TYPE:
        currentTypeDef = currentTypeDef.type;
        fieldConfig.required = true;
        break;
      case Kind.LIST_TYPE:
        if (fieldConfig.list) {
          throw new PackageError('Multi dimensional lists are not supported');
        }
        currentTypeDef = currentTypeDef.type;
        fieldConfig.list = true;
        break;
      default:
        throw new PackageError(
          `Invalid type definition for field ${def.name.value}`
        );
    }
  }

  return fieldConfig;
}

/**
 * Sets the field access to READ only if field has an external resolver
 * @param params
 */
function setFieldAccess(params: {
  fieldConfig: FieldConfig;
  resolvers: ResolverConfigMap;
  fieldName: string;
  typeName: string;
}): FieldConfig {
  const { fieldConfig, resolvers, typeName, fieldName } = params;

  // If access is not yet set and we have custom resolver, set to READ only
  if (!fieldConfig.access && resolvers?.[typeName]?.[fieldName]) {
    return {
      ...fieldConfig,
      access: [FieldAccess.READ],
    };
  }

  return fieldConfig;
}

/**
 * Converts AST field definition to FieldConfig
 *
 * @param def
 * @returns {{required: boolean, list: boolean, description: (?string|*|null)}}
 */
function definitionToFieldConfig(
  def: FieldDefinitionNode
): FieldConfig | undefined | null {
  if (def.kind !== Kind.FIELD_DEFINITION) {
    throw new PackageError('Only supports field definitions in object');
  }

  let currentTypeDef = def.type;
  const fieldConfig: FieldConfig = {
    typeName: '',
    required: currentTypeDef.kind === Kind.NON_NULL_TYPE,
    list: false,
  };

  // Process directives
  (def.directives || []).forEach((directive) => {
    switch (directive.name.value) {
      // Relation fields are not added to the type config
      case RELATION_DIRECTIVE_NAME:
        return null;
      case 'unique':
        fieldConfig.unique = true;
        break;
      case 'index':
        fieldConfig.index = true;
        break;
      case 'input':
        try {
          fieldConfig.inputElementType = getDirectiveValues(
            getDirective('input', DirectiveLocation.FIELD_DEFINITION),
            def,
            {}
          ).type;
        } catch (e) {
          throw new PackageError(
            `Invalid use of directive @input on field "${def.name.value}": ${e.message}`
          );
        }
        break;
      default: {
        throw new PackageError(
          `Unknown directive "${directive.name.value}" on field "${def.name.value}"`
        );
      }
    }
  });

  const description = getDescription(def);
  if (description) {
    fieldConfig.description = description;
  }
  while (currentTypeDef) {
    switch (currentTypeDef.kind) {
      case Kind.NAMED_TYPE:
        fieldConfig.typeName = currentTypeDef.name.value;
        currentTypeDef = null;
        break;
      case Kind.NON_NULL_TYPE:
        currentTypeDef = currentTypeDef.type;
        // fieldConfig.required = true; // Already set above
        break;
      case Kind.LIST_TYPE:
        if (fieldConfig.list) {
          throw new PackageError('Multi dimensional lists are not supported');
        }
        currentTypeDef = currentTypeDef.type;
        fieldConfig.list = true;
        break;
      default:
        throw new PackageError(
          `Invalid type definition for field ${def.name.value}`
        );
    }
  }

  // Process input arguments
  const args = {};
  (def.arguments || []).forEach((inputArgument) => {
    if (inputArgument.kind === Kind.INPUT_VALUE_DEFINITION) {
      const argConfig: {
        [x: string]: any;
      } = {
        list: false,
        required: false,
      };
      let currentArgTypeDef = inputArgument.type;

      while (currentArgTypeDef) {
        switch (currentArgTypeDef.kind) {
          case Kind.NAMED_TYPE:
            argConfig.typeName = currentArgTypeDef.name.value;
            currentArgTypeDef = null;
            break;
          case Kind.NON_NULL_TYPE:
            currentArgTypeDef = currentArgTypeDef.type;
            argConfig.required = true;
            break;
          case Kind.LIST_TYPE:
            if (argConfig.list) {
              throw new PackageError(
                'Multi dimensional lists are not supported as field input arguments'
              );
            }
            currentArgTypeDef = currentArgTypeDef.type;
            argConfig.list = true;
            break;
          default:
            throw new PackageError(
              `Invalid type definition for input argument ${inputArgument.name.value} of field ${def.name.value}`
            );
        }
      }

      // Add description
      if (inputArgument.description) {
        argConfig.description = inputArgument.description.value;
      }

      args[inputArgument.name.value] = argConfig;
    }
  });
  if (Object.keys(args).length) {
    fieldConfig.arguments = args;
  }

  return fieldConfig;
}

/**
 * Converts AST field definition to FieldConfig
 *
 * @param def
 * @returns {{required: boolean, list: boolean, description: (?string|*|null)}}
 */
function definitionToMutationConfig(
  def: FieldDefinitionNode
): MutationConfig | undefined | null {
  if (def.kind !== Kind.FIELD_DEFINITION) {
    throw new PackageError('Only supports field definitions for mutations');
  }

  let currentTypeDef = def.type;
  const mutationConfig: MutationConfig = {
    name: def.name.value,
    fields: {},
    permissions: [],
    inputFields: {},
  };

  // Process directives
  (def.directives || []).forEach((directive) => {
    switch (directive.name.value) {
      default: {
        throw new PackageError(
          `Unknown directive "${directive.name.value}" for mutation field "${def.name.value}"`
        );
      }
    }
  });

  const description = getDescription(def);
  if (description) {
    mutationConfig.description = description;
  }
  while (currentTypeDef) {
    switch (currentTypeDef.kind) {
      case Kind.NAMED_TYPE:
        mutationConfig.outputTypeName = currentTypeDef.name.value;
        currentTypeDef = null;
        break;
      case Kind.NON_NULL_TYPE:
        throw new PackageError(
          'Non NULL field types are not supported for mutations'
        );
      case Kind.LIST_TYPE:
        throw new PackageError(
          'List return types are not supported for mutations'
        );
      default:
        throw new PackageError(
          `Invalid type definition for field ${def.name.value}`
        );
    }
  }

  // Process input arguments
  const args: ArgumentConfigMap = {};
  (def.arguments || []).forEach((inputArgument) => {
    if (inputArgument.kind === Kind.INPUT_VALUE_DEFINITION) {
      const argConfig: ArgumentConfig = {
        typeName: '',
        list: false,
        required: false,
      };
      let currentArgTypeDef = inputArgument.type;

      while (currentArgTypeDef) {
        switch (currentArgTypeDef.kind) {
          case Kind.NAMED_TYPE:
            argConfig.typeName = currentArgTypeDef.name.value;
            currentArgTypeDef = null;
            break;
          case Kind.NON_NULL_TYPE:
            currentArgTypeDef = currentArgTypeDef.type;
            argConfig.required = true;
            break;
          case Kind.LIST_TYPE:
            if (argConfig.list) {
              throw new PackageError(
                'Multi dimensional lists are not supported as field input arguments'
              );
            }
            currentArgTypeDef = currentArgTypeDef.type;
            argConfig.list = true;
            break;
          default:
            throw new PackageError(
              `Invalid type definition for input argument ${inputArgument.name.value} of mutation ${def.name.value}`
            );
        }
      }

      // Add description
      if (inputArgument.description) {
        argConfig.description = inputArgument.description.value;
      }

      args[inputArgument.name.value] = argConfig; // @TODO: Don't to type casting here
    }
  });
  const argumentNames = Object.keys(args);
  if (argumentNames.length !== 1 || !args.input) {
    throw new PackageError(
      `Invalid input arguments for mutation "${def.name.value}". ` +
        'Mutations have to have one input argument named "input".'
    );
  }

  // Check and set input type
  if (!args.input.required) {
    throw new PackageError(
      `Invalid input type for mutation "${def.name.value}": Input type cannot be NULL`
    );
  }
  if (args.input.list) {
    throw new PackageError(
      `Invalid input type for mutation "${def.name.value}": Input type cannot be of type list`
    );
  }
  mutationConfig.inputTypeName = args.input.typeName;

  return mutationConfig;
}

/**
 * Transforms definition node to EnumTypeConfig
 * @param def
 */
function definitionToEnumTypeConfig(
  def: EnumTypeDefinitionNode
): EnumTypeConfig {
  if (def.kind !== Kind.ENUM_TYPE_DEFINITION) {
    throw new PackageError('Only supports field definitions in object');
  }

  const config: EnumTypeConfig = {
    name: def.name.value,
    kind: TypeKind.ENUM,
    values: def.values.reduce(
      (
        valueMap: EnumValueConfigMap,
        valueDefinition: EnumValueDefinitionNode
      ) => {
        const description = getDescription(valueDefinition);
        const valueConfig: EnumValueConfig = {
          value: valueDefinition.name.value,
        };
        if (description) {
          valueConfig.description = description;
        }
        valueMap[valueDefinition.name.value] = valueConfig;

        // Process directives
        (valueDefinition.directives || []).forEach((directive) => {
          switch (directive.name.value) {
            default: {
              throw new PackageError(
                `Unknown directive "${directive.name.value}" on value ` +
                  `"${valueDefinition.name.value}" of enum "${def.name.value}"`
              );
            }
          }
        });

        return valueMap;
      },
      {}
    ),
  };

  // Add description if any
  const description = getDescription(def);
  if (description) {
    config.description = description;
  }

  // Process directives
  (def.directives || []).forEach((directive) => {
    switch (directive.name.value) {
      default: {
        throw new PackageError(
          `Unknown directive "${directive.name.value}" on enum "${def.name.value}"`
        );
      }
    }
  });

  return config;
}

/**
 * Returns the description of an AST node
 * @param node
 * @returns {*}
 */
function getDescription(node: ASTNode): string | undefined | null {
  if (node.hasOwnProperty('description')) {
    return (node as any).description && (node as any).description.value;
  }

  return null;
}

export const DEFAULT_PERMISSIONS: ObjectTypePermissionSet = {
  permissions: [{ role: Role.ANONYMOUS }, { role: Role.RUNTIME }],
  mutations: {
    create: [{ role: Role.STAFF }, { role: Role.RUNTIME }],
    update: [{ role: Role.STAFF }, { role: Role.RUNTIME }],
    delete: [{ role: Role.STAFF }, { role: Role.RUNTIME }],
    publish: [{ role: Role.STAFF }, { role: Role.RUNTIME }],
    unpublish: [{ role: Role.STAFF }, { role: Role.RUNTIME }],
  },
};

export default unpack;
