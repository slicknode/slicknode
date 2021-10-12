/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import { GraphQLScalarType } from 'graphql';
import { ScalarTypeConfig, TypeKind } from '../../../definition';

// As per the GraphQL Spec, Integers are only treated as valid when a valid
// 32-bit signed integer, providing the broadest support across platforms.
//
// n.b. JavaScript's integers are safe between -(2^53 - 1) and 2^53 - 1 because
// they are internally represented as IEEE 754 doubles.
const MAX_INT = 2147483647;
const MIN_INT = -2147483648;
/**
 * Function that checks whether a date string represents a valid date in
 * the ISO 8601 formats:
 * - YYYY
 * - YYYY-MM
 * - YYYY-MM-DD,
 * - YYYY-MM-DDThh:mmZ
 * - YYYY-MM-DDThh:mm:ssZ
 * - YYYY-MM-DDThh:mm:ss.sssZ
 */
function isValidDate(datestring: string): boolean {
  // An array of regular expression containing the supported ISO 8601 formats
  const ISO_8601_REGEX = [
    /^\d{4}$/, // YYYY
    /^\d{4}-\d{2}$/, // YYYY-MM
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/, // YYYY-MM-DDThh:mmZ
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, // YYYY-MM-DDThh:mm:ssZ
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, // YYYY-MM-DDThh:mm:ss.sssZ
  ];

  // Validate the structure of the date-string
  if (!ISO_8601_REGEX.some((regex) => regex.test(datestring))) {
    return false;
  }

  // Check if it is a correct date using the javascript Date parse() method.
  const time = Date.parse(datestring);
  if (time !== time) {
    return false;
  }

  // Perform specific checks for the hours in datetimes
  // (i.e. datetimes that incude YYYY-MM-DDThh). We need
  // to make sure that the number of hours in a day ranges
  // from 0 to 23. This needs to be done because node v6 and above
  // support the hour range 0-24 while other node versions only support
  // range 0 to 23. We need to keep this consistent across node versions.
  if (datestring.length >= 13) {
    const hour = Number(datestring.substr(11, 2));
    if (hour > 23) {
      return false;
    }
  }

  // Perform specific checks for dates (i.e. that include
  // YYYY-MM-DD). We need
  // to make sure that the date string has the correct
  // number of days for a given month. This check is required
  // because the javascript Date.parse() assumes every month has 31 days.
  if (datestring.length >= 10) {
    const year = Number(datestring.substr(0, 4));
    const month = Number(datestring.substr(5, 2));
    const day = Number(datestring.substr(8, 2));

    switch (month) {
      case 2: // February
        if (leapYear(year) && day > 29) {
          return false;
        } else if (!leapYear(year) && day > 28) {
          return false;
        }
        return true;
      case 4: // April
      case 6: // June
      case 9: // September
      case 11: // November
        if (day > 30) {
          return false;
        }
        break;
    }
  }

  // Every year that is exactly divisible by four
  // is a leap year, except for years that are exactly
  // divisible by 100, but these centurial years are
  // leap years if they are exactly divisible by 400.
  // For example, the years 1700, 1800, and 1900 are not leap years,
  // but the years 1600 and 2000 are.
  function leapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }
  return true;
}

export const GraphQLDateTime = new GraphQLScalarType({
  name: 'DateTime',
  description: 'An ISO-8601 encoded UTC date string.',
  serialize(value: any): string {
    if (value instanceof Date) {
      const time = value.getTime();
      if (time === time) {
        return value.toISOString();
      }
      throw new TypeError('DateTime cannot represent an invalid Date instance');
    } else if (typeof value === 'string' || value instanceof String) {
      if (isValidDate(String(value))) {
        return String(value);
      }
      throw new TypeError(
        'DateTime cannot represent an invalid ISO 8601 date string ' + value
      );
    } else if (typeof value === 'number' || value instanceof Number) {
      // Serialize from Unix timestamp: the number of
      // seconds since 1st Jan 1970.

      // Unix timestamp are 32-bit signed integers
      if (value === value && value <= MAX_INT && value >= MIN_INT) {
        // Date represents unix time as the number of
        // milliseconds since 1st Jan 1970 therefore we
        // need to perform a conversion.
        const date = new Date(Number(value) * 1000);
        return date.toISOString();
      }
      throw new TypeError(
        'DateTime cannot represent an invalid Unix timestamp ' + value
      );
    } else {
      throw new TypeError(
        'DateTime cannot be serialized from a non string, ' +
          'non numeric or non Date type ' +
          String(value)
      );
    }
  },
  parseValue(value: any): Date {
    if (!(typeof value === 'string' || value instanceof String)) {
      throw new TypeError(
        'DateTime cannot represent non string type ' + String(value)
      );
    }
    if (isValidDate(String(value))) {
      return new Date(value as any);
    }
    throw new TypeError(
      'DateTime cannot represent an invalid ISO 8601 date ' + value
    );
  },
  parseLiteral(ast) {
    if (ast.kind === 'StringValue') {
      if (isValidDate(ast.value)) {
        return new Date(ast.value);
      }

      throw new TypeError(
        `The value is not a valid ISO 8601 date: "${ast.value}"`
      );
    }
    return null;
  },
});

const DateTimeConfig: ScalarTypeConfig = {
  kind: TypeKind.SCALAR,
  name: 'DateTime',
  type: GraphQLDateTime,
};

export default DateTimeConfig;
