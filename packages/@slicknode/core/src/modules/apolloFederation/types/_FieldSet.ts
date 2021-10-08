/**
 * Created by Ivo Meißner on 2019-06-08
 *
 */
import { GraphQLScalarType, Kind } from 'graphql';
import { ScalarTypeConfig, TypeKind } from '../../../definition';

function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    default:
      return null;
  }
}

const FieldSetType = new GraphQLScalarType({
  name: '_FieldSet',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral,
});

const _FieldSet: ScalarTypeConfig = {
  kind: TypeKind.SCALAR,
  name: '_FieldSet',
  type: FieldSetType,
};

export default _FieldSet;
