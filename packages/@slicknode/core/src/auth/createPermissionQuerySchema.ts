/**
 * Created by Ivo Meißner on 13.07.17.
 *
 */

import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLString,
  GraphQLList,
  GraphQLEnumValueConfigMap,
  GraphQLFieldConfigMap,
} from 'graphql';
import { GraphQLFieldConfig } from 'graphql';
import _ from 'lodash';
// import { ObjectTypeConfig } from '../schema/type';
// import { getTypeFilterName } from '../schema/identifiers';
// import { HANDLER_POSTGRES } from '../schema/handler';
import RoleType from './RoleType';
import { ObjectTypeConfig } from '../definition';
import { getTypeFilterName } from '../schema/identifiers';
import { HANDLER_POSTGRES } from '../schema/handler';
import Context from '../context';

const operationType = new GraphQLEnumType({
  name: 'NodeOperation',
  description: 'The operations that can be performed on a node',
  values: {
    CREATE: { value: 'CREATE' },
    READ: { value: 'READ' },
    UPDATE: { value: 'UPDATE' },
    DELETE: { value: 'DELETE' },
    PUBLISH: { value: 'PUBLISH' },
    UNPUBLISH: { value: 'UNPUBLISH' },
  },
});

export function createPermissionQuerySchema(
  schema: GraphQLSchema,
  typeConfig: ObjectTypeConfig
): GraphQLSchema {
  const fields: GraphQLFieldConfigMap<any, Context> = {};
  fields['scope'] = createScopeFieldConfig(typeConfig);

  // Check if type handler supports query filtering
  if (typeConfig.handler && typeConfig.handler.kind === HANDLER_POSTGRES) {
    const nodeFilterType = schema.getType(getTypeFilterName(typeConfig.name));
    if (nodeFilterType instanceof GraphQLInputObjectType) {
      fields['node'] = {
        type: GraphQLBoolean,
        description: 'Returns true if the node should be returned',
        args: {
          filter: {
            type: new GraphQLNonNull(nodeFilterType),
            description: 'The filter that should be applied to all nodes',
          },
        },
      };
    }
  }

  const query = new GraphQLObjectType({
    name: 'PermissionQuery',
    description: `The permission query schema for the type ${typeConfig.name}`,
    fields,
  });

  // Build permission schema based on original schema
  return new GraphQLSchema({
    query,
    types: [..._.values(schema.getTypeMap()), query],
  });
}

export function createScopeFieldConfig(
  typeConfig: ObjectTypeConfig
): GraphQLFieldConfig<any, any> {
  return {
    type: GraphQLBoolean,
    description: 'The scope to which the permissions should be granted',
    args: {
      role: {
        type: new GraphQLNonNull(RoleType),
        description: 'The role that the permission should be granted to',
      },
      ...(typeConfig.name !== 'Mutation'
        ? {
            // Fields for non mutation types
            operations: {
              type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(operationType))
              ),
              description: 'The operations that are allowed',
            },
            fields: {
              type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
              description:
                'EXPERIMENTAL: The fields on which permission is granted',
            },
          }
        : {
            fields: {
              type: new GraphQLNonNull(
                new GraphQLList(new GraphQLNonNull(GraphQLString))
              ),
              description: 'The mutation fields on which access is granted',
            },
          }),
    },
  };
}
