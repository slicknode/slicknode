/**
 * Created by Ivo Meißner on 2019-06-08
 *
 */
import Context from '../../context';
import SchemaBuilder from '../../schema/builder';
import { ModuleConfig } from '../../definition';
import {
  parse,
  print,
  printSchema,
  Kind,
  ASTNode,
  isTypeDefinitionNode,
} from 'graphql';

export default {
  Query: {
    _service: {
      typeName: '_Service',
      required: true,
      description: 'The federated apollo service definition',
      async resolve(
        root: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) {
        // Create new schema without federation types
        const builder = new SchemaBuilder({
          modules: context.schemaBuilder
            .getModules()
            .filter(
              (module: ModuleConfig) => module.id !== 'apollo-federation'
            ),
        });

        // Get AST from schema so we can add directives and remove unnecessary nodes
        const ast = parse(printSchema(builder.getSchema()));

        // Update definitions and inject directives
        const definitions = ast.definitions.map((definition) => {
          // Return Query, Mutation, Subscription type as type extensions
          if (
            isTypeDefinitionNode(definition) &&
            ['Query', 'Mutation', 'Subscription'].includes(
              definition.name.value
            )
          ) {
            return {
              ...definition,
              kind: Kind.OBJECT_TYPE_EXTENSION,
            };
          }
          if (definition.kind === Kind.OBJECT_TYPE_DEFINITION) {
            try {
              const typeConfig = builder.getObjectTypeConfig(
                definition.name.value
              );
              // Only add directives for Node types
              if ((typeConfig.interfaces || []).includes('Node')) {
                return {
                  ...definition,
                  directives: [
                    ...(definition.directives || []),
                    // Add key directives for ID and unique fields
                    ...Object.keys(typeConfig.fields).reduce(
                      (keyDirectives: Array<any>, fieldName: string) => {
                        const fieldConfig = typeConfig.fields[fieldName];
                        if (fieldName === 'id' || fieldConfig.unique) {
                          keyDirectives.push({
                            kind: Kind.DIRECTIVE,
                            name: {
                              kind: Kind.NAME,
                              value: 'key',
                            },
                            arguments: [
                              {
                                kind: Kind.ARGUMENT,
                                name: {
                                  kind: Kind.NAME,
                                  value: 'fields',
                                },
                                value: {
                                  kind: Kind.STRING,
                                  value: fieldName,
                                },
                              },
                            ],
                          });
                        }
                        return keyDirectives;
                      },
                      []
                    ),
                  ],
                };
              }
            } catch (e) {
              // Ignore generated types that are not explicitly configured in schema builder
            }
          }
          return definition;
        });

        const sdl = print({
          ...ast,
          definitions,
        } as ASTNode); // @TODO: Fix types

        return {
          sdl,
        };
      },
    },
    _entities: {
      typeName: '_Entity',
      required: true,
      list: [false],
      arguments: {
        representations: {
          typeName: '_Any',
          required: true,
          list: true,
          description:
            'Loads the entities from the service according to the federated apollo specification',
        },
      },
      resolve(
        root: {
          [x: string]: any;
        },
        args: {
          [x: string]: any;
        },
        context: Context
      ) {
        return args.representations.map(async (representation) => {
          try {
            const typeName = representation.__typename;
            if (!typeName) {
              throw new Error('Typename not provided');
            }
            const typeConfig =
              context.schemaBuilder.getObjectTypeConfig(typeName);
            if (typeConfig.directAccess === false) {
              return null;
            }

            // Check all unique keys
            const uniqueKeys = Object.keys(typeConfig.fields).filter(
              (fieldName) =>
                typeConfig.fields[fieldName].unique || fieldName === 'id'
            );

            for (const key of uniqueKeys) {
              if (representation.hasOwnProperty(key)) {
                let value = representation[key];

                // Convert global to local ID if ID
                if (key === 'id') {
                  value = context.fromGlobalId(value).id;
                }

                // Load node via dataloader
                return await context.getLoader(typeName, key).load(value);
              }
            }
          } catch (e) {
            return null;
          }
          return null;
        });
      },
    },
  },
};
