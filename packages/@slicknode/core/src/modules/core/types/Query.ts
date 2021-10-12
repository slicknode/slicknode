/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { ObjectTypeConfig, TypeKind } from '../../../definition';

const Query: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'Query',
  description: 'The root query type of the GraphQL endpoint',
  fields: {
    viewer: {
      typeName: 'Viewer',
      required: true,
      description: 'The current viewer object',
      resolve: () => {
        return {};
      },
    },
  },
};

export default Query;
