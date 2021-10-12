/**
 * Created by Ivo Meißner on 2019-06-08
 *
 */
import { GraphQLScalarType, Kind } from 'graphql';
import { ScalarTypeConfig, TypeKind } from '../../../definition';

function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach((field) => {
        value[field.name.value] = parseLiteral(field.value);
      });

      return value;
    }
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    default:
      return null;
  }
}
const AnyType = new GraphQLScalarType({
  name: '_Any',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral,
});

const _Any: ScalarTypeConfig = {
  kind: TypeKind.SCALAR,
  name: '_Any',
  type: AnyType,
};

export default _Any;
