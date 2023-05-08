/**
 * Created by Ivo Meißner on 02.05.18
 *
 */
import Context from '../../context';
import { ObjectTypeConfig } from '../../definition';
import { getHandler } from './index';
import toTableName from './postgres/toTableName';
import toColumnName from './postgres/toColumnName';
import type { Knex } from 'knex';

type QueryFilterFunction = (qb: Knex.QueryBuilder) => void;

interface DbNameProxy {
  /**
   * Name proxy to get DB table and column names
   */
  $names: {
    [name: string]: {
      $name: string;
      [field: string]: string;
    };
  };
}

interface DbQueryProxy {
  [typeName: string]: {
    /**
     * Returns a single node of the given type
     * If the where clause returns multiple objects, returns the first node
     */
    find: (
      where?:
        | {
            [x: string]: any;
          }
        | QueryFilterFunction,
      options?: {
        requireResult?: boolean;
        preview?: boolean;
      }
    ) => Promise<
      | {
          [x: string]: any;
        }
      | undefined
      | null
    >;
    /**
     * Returns all nodes for a given filter criteria
     * @param where
     * @returns {Promise<*>}
     */
    fetchAll: (
      where?:
        | {
            [x: string]: any;
          }
        | QueryFilterFunction,
      options?: {
        preview?: boolean;
      }
    ) => Promise<
      Array<{
        [x: string]: any;
      }>
    >;
    /**
     * Updates a node for the given ID
     * @param id
     * @param data
     * @param requireResult
     * @returns {Promise.<?Object>}
     */
    update: (
      id: string | number,
      data: {
        [x: string]: any;
      },
      options?: {
        preview?: boolean;
        requireResult?: boolean;
      }
    ) => Promise<any>;

    /**
     * Upsert node. Creates new node if none of the unique values exist, updates the row
     * if a record already exists in DB
     * @param data
     */
    upsert: (
      data: {
        [x: string]: any;
      },
      options?: {
        preview?: boolean;
      }
    ) => Promise<any>;

    /**
     * Create a new node of the given type
     * @param data
     * @returns {Promise.<?Object>}
     */
    create: (
      data: {
        [x: string]: any;
      },
      options?: {
        preview?: boolean;
      }
    ) => Promise<
      | {
          [x: string]: any;
        }
      | undefined
      | null
    >;
    /**
     * Helper function that deletes a objects of the provided type that match the given where clause
     * If a function is provided, this needs to match the function signature that can be passed to
     * knexQueryBuilder.where(<arg>);
     *
     * @param where
     * @returns {Promise.<?Object>}
     */
    delete: (
      where:
        | {
            [x: string]: any;
          }
        | QueryFilterFunction,
      options?: {
        preview?: boolean;
        returnNodes?: boolean;
      }
    ) => Promise<any>;
  };
}

export type DbProxy = DbNameProxy & DbQueryProxy;

/**
 * Creates a proxy to the DB identifiers
 * @param originalContext
 */
function createNameProxy(originalContext: Context) {
  return new Proxy(originalContext, {
    get: (context, name) => {
      const typeConfig = context.schemaBuilder.getObjectTypeConfig(
        String(name)
      );
      const schemaName = context.getDBSchemaName();
      return Object.keys(typeConfig.fields).reduce(
        (nameMap, fieldName) => {
          return {
            ...nameMap,
            [fieldName]: toColumnName(fieldName),
          };
        },
        {
          $name: toTableName(typeConfig, schemaName),
        }
      );
    },
  });
}

/**
 * Creates a proxy object to query the datastore for the provided context
 * All types are dynamically accessible via the proxy object
 *
 * For example:
 *
 *    const db = createDbProxy(context);
 *
 *    // Create new object of type `Article`
 *    const article = await db.Article.create({title: 'Nice article', text: 'text'});
 *
 *    // Update an Article
 *    const updatedArticle = await db.Article.update(article.id, {
 *      title: 'Changed title'
 *    });
 *
 *    // List all articles with title = "Changed title"
 *    const articles = await db.Article.fetchAll({title: 'Changed title'});
 *
 *    // Find one article by ID
 *    const a = await db.Article.find({id: 123});
 *
 *    // Delete all articles with title = "Changed title"
 *    await db.Article.delete({
 *      title: "Changed title"
 *    });
 *
 * @param originalContext
 * @returns Proxy
 */
export default function createDbProxy(originalContext: Context): DbProxy {
  return new Proxy(
    originalContext as any,
    {
      get: (context: Context, name: string) => {
        if (name === '$names') {
          return createNameProxy(context);
        }

        const typeConfig: ObjectTypeConfig =
          context.schemaBuilder.getObjectTypeConfig(name);

        return {
          /**
           * Returns a single node of the given type
           * If the where clause returns multiple objects, returns the first node
           *
           * @param where
           * @param options
           * @returns {Promise.<?Object>}
           */
          async find(
            where?:
              | {
                  [x: string]: any;
                }
              | Function,
            options?: {
              requireResult?: boolean;
              preview?: boolean;
            }
          ): Promise<
            | {
                [x: string]: any;
              }
            | undefined
            | null
          > {
            const result = await getHandler(typeConfig.handler).find(
              typeConfig,
              where,
              context,
              Boolean(options?.preview)
            );
            if (!result && options?.requireResult) {
              throw new Error(
                `Object of type ${name} was not found in the database for the filter criteria`
              );
            }
            return result;
          },

          /**
           * Returns all nodes for a given filter criteria
           * @param where
           * @param options
           * @returns {Promise<*>}
           */
          async fetchAll(
            where?:
              | {
                  [x: string]: any;
                }
              | Function,
            options?: {
              preview?: boolean;
            }
          ): Promise<
            Array<{
              [x: string]: any;
            }>
          > {
            return await getHandler(typeConfig.handler).fetchAll(
              typeConfig,
              where || {},
              context,
              Boolean(options?.preview)
            );
          },
          /**
           * Upsert node. Creates new node if none of the unique values exist, updates the row
           * if a record already exists in DB
           * @param data
           * @param options
           */
          async upsert(
            data: {
              [x: string]: any;
            },
            options?: {
              preview?: boolean;
            }
          ) {
            return await getHandler(typeConfig.handler).upsert(
              typeConfig,
              data,
              context,
              Boolean(options?.preview)
            );
          },
          /**
           * Updates a node for the given ID
           * @param id
           * @param data
           * @param options
           * @returns {Promise.<?Object>}
           */
          async update(
            id: string | number,
            data: {
              [x: string]: any;
            },
            options?: {
              requireResult?: boolean;
              preview?: boolean;
            }
          ): Promise<any> {
            const result = await getHandler(typeConfig.handler).update(
              typeConfig,
              String(id),
              data,
              context,
              Boolean(options?.preview)
            );
            if (!result && options?.requireResult) {
              throw new Error(
                `Object of type ${name} was not updated in the database for id ${id}`
              );
            }
            return result;
          },

          /**
           * Create a new node of the given type
           * @param data
           * @param options
           * @returns {Promise.<?Object>}
           */
          async create(
            data: {
              [x: string]: any;
            },
            options?: {
              preview?: boolean;
            }
          ): Promise<
            | {
                [x: string]: any;
              }
            | undefined
            | null
          > {
            const result = await getHandler(typeConfig.handler).create(
              typeConfig,
              data,
              context,
              Boolean(options?.preview)
            );
            if (!result) {
              throw new Error(
                `Node of type ${name} was not created in the database`
              );
            }
            return result;
          },

          /**
           * Helper function that deletes objects of the provided type that match the given where clause
           * If a function is provided, this needs to match the function signature that can be passed to
           * knexQueryBuilder.where(<arg>);
           *
           * @param where
           * @param options
           *    returnNodes If true, will return the deleted nodes
           *    preview If true, will load from preview tables
           * @returns {Promise.<?Object>}
           */
          async delete(
            where:
              | {
                  [x: string]: any;
                }
              | Function,
            options?: {
              returnNodes?: boolean;
              preview?: boolean;
            }
          ): Promise<any> {
            if (
              !where ||
              (typeof where !== 'function' && !Object.keys(where).length)
            ) {
              throw new Error(
                'You have to provide a filter query to delete objects'
              );
            }
            try {
              return await getHandler(typeConfig.handler).delete(
                typeConfig,
                where,
                context,
                Boolean(options?.returnNodes),
                Boolean(options?.preview)
              );
            } catch (e) {
              throw new Error(
                `Node of type ${name} could not be deleted from the database: ${e.message}`
              );
            }
          },
        };
      },
      set: () => {
        throw new Error('Cannot mutate DB proxy');
      },
    } as any
  );
}
