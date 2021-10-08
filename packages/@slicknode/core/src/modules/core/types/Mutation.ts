/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */
import { ObjectTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';

const Mutation: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'Mutation',
  description: 'The root mutation type of the GraphQL endpoint',
  fields: {},
  permissions: [],
};

export default Mutation;
