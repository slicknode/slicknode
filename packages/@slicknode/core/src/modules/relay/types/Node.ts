/**
 * Created by Ivo Meißner on 02.12.16.
 *
 */

import {
  FieldAccess,
  InterfaceTypeConfig,
  TypeKind,
} from '../../../definition';
import { GraphQLResolveInfo } from 'graphql';
import Context from '../../../context';
import _ from 'lodash';
import { defaultTypeResolver } from '../../../schema/resolvers';

/**
 * Configuration for relay app
 * @type {{namespace: null, label: string, types: *[]}}
 */
export const Node: InterfaceTypeConfig = {
  kind: TypeKind.INTERFACE,
  name: 'Node',
  fields: {
    id: {
      typeName: 'ID',
      required: true,
      list: false,
      description: 'The global ID of the object',
      // defaultValue: 'v1',
      validators: [
        {
          type: 'gid',
        },
      ],
      access: [FieldAccess.READ],
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
        return context.toGlobalId(info.parentType.name, source.id);
      },
    },
  },
  resolveType: defaultTypeResolver,
};

export default Node;
