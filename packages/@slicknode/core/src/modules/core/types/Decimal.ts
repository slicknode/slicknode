/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { ScalarTypeConfig, TypeKind } from '../../../definition';
import { DECIMAL_MAX_PRECISION, DECIMAL_MAX_SCALE } from '../../../config';

/**
 * Function that checks whether a decimal string represents a valid decimal number:
 * - D
 * - D.D
 */
function isValidDecimal(decimalString: string): boolean {
  // An array of regular expression containing the supported decimal inputs
  const DECIMAL_REGEX = [
    new RegExp(`^-?\\d{1,${DECIMAL_MAX_PRECISION}}$`), // ddd
    new RegExp(
      `^-?\\d{1,${DECIMAL_MAX_PRECISION}}\\.\\d{1,${DECIMAL_MAX_SCALE}}$`
    ), // dddd.dddd
  ];

  // Validate the structure of the decimal-string
  const matches = DECIMAL_REGEX.some((regex) => regex.test(decimalString));
  if (matches) {
    return (
      decimalString.replace('-', '').split('.').join('').length <=
      DECIMAL_MAX_PRECISION
    );
  }

  return false;
}

export const GraphQLDecimal = new GraphQLScalarType({
  name: 'Decimal',
  description: 'A decimal value string',
  serialize(value: any): string {
    const stringValue = String(value);
    if (isValidDecimal(stringValue)) {
      return stringValue;
    }
    throw new TypeError(
      'Decimal cannot represent an invalid decimal value ' + stringValue
    );
  },
  parseValue(value: any): string {
    const stringValue = String(value);
    if (
      !(
        typeof value === 'string' ||
        value instanceof String ||
        (typeof value === 'number' && isFinite(value))
      )
    ) {
      throw new TypeError(
        'Decimal cannot represent non string type ' + stringValue
      );
    }
    if (
      isValidDecimal(stringValue) &&
      stringValue !== 'undefined' &&
      stringValue !== 'null'
    ) {
      return stringValue;
    }
    throw new TypeError(
      'Decimal cannot represent an invalid decimal value ' + stringValue
    );
  },
  parseLiteral(ast) {
    if (
      ast.kind === Kind.STRING ||
      ast.kind === Kind.INT ||
      ast.kind === Kind.FLOAT
    ) {
      if (isValidDecimal(String(ast.value))) {
        return String(ast.value);
      }
    }
    return null;
  },
});

const DecimalConfig: ScalarTypeConfig = {
  kind: TypeKind.SCALAR,
  name: 'Decimal',
  type: GraphQLDecimal,
};

export default DecimalConfig;
