/**
 * Created by Ivo Meißner on 26.11.17.
 *
 */

import { GraphQLDecimal } from '../Decimal';
import { expect } from 'chai';
import { Kind, KindEnum, ValueNode } from 'graphql';
import _ from 'lodash';

const INVALID_DECIMALS = [
  null,
  {},
  Infinity,
  [],
  '234.',
  '.456',
  'abd',
  '.',
  '9'.repeat(1001),
  '0.' + '1'.repeat(1000),
  '9'.repeat(500) + '.' + '9'.repeat(501),
  true,
];

// Pairs of [ input, output ] values
const VALID_DECIMALS = [
  [0, '0'],
  [123, '123'],
  ['123.35', '123.35'],
  [1234.56, '1234.56'],
  [-34, '-34'],
  [-35.56, '-35.56'],
  ['0', '0'],
  ['-3', '-3'],
  ['-0.3', '-0.3'],
  ['9'.repeat(1000), '9'.repeat(1000)],
  ['-' + '9'.repeat(1000), '-' + '9'.repeat(1000)],
  ['0.' + '9'.repeat(999), '0.' + '9'.repeat(999)],
  ['-0.' + '9'.repeat(999), '-0.' + '9'.repeat(999)],
  [
    '9'.repeat(500) + '.' + '9'.repeat(500),
    '9'.repeat(500) + '.' + '9'.repeat(500),
  ],
];

describe('GraphQLDecimal', () => {
  it('has a description', () => {
    expect(GraphQLDecimal.description).to.equal('A decimal value string');
  });

  describe('serialization', () => {
    [...INVALID_DECIMALS, null, undefined, NaN].forEach((invalidInput) => {
      it(`throws error when serializing ${JSON.stringify(
        invalidInput
      )}`, () => {
        expect(() => GraphQLDecimal.serialize(invalidInput)).to.throw(
          TypeError,
          'Decimal cannot represent an invalid decimal'
        );
      });
    });

    VALID_DECIMALS.forEach(([value, expected]) => {
      it(`serializes javascript Decimal ${JSON.stringify(
        value
      )} into ${JSON.stringify(expected)}`, () => {
        expect(GraphQLDecimal.serialize(value)).to.equal(expected);
      });
    });
  });

  describe('value parsing', () => {
    VALID_DECIMALS.forEach(([value, expected]) => {
      it(`parses decimal value ${JSON.stringify(
        value
      )} into javascript ${JSON.stringify(expected)}`, () => {
        expect(GraphQLDecimal.parseValue(value)).to.equal(expected);
      });
    });

    INVALID_DECIMALS.forEach((invalidInput) => {
      it(`throws error when parsing ${JSON.stringify(invalidInput)}`, () => {
        expect(() => {
          const parsed = GraphQLDecimal.parseValue(invalidInput);
        }).to.throw(TypeError, 'Decimal cannot represent');
      });
    });

    [undefined, NaN].forEach((invalidInput) => {
      it(`throws error for ${JSON.stringify(invalidInput)}`, () => {
        expect(() => {
          GraphQLDecimal.parseValue(invalidInput);
        }).to.throw('Decimal cannot represent non string type');
      });
    });
  });

  describe('literal passing', () => {
    VALID_DECIMALS.forEach(([value, expected]) => {
      it(`parses literal ${JSON.stringify(
        value
      )} into javascript string ${JSON.stringify(expected)}`, () => {
        let kind: KindEnum = Kind.STRING;
        if (_.isInteger(value)) {
          kind = Kind.INT;
        } else if (_.isNumber(value)) {
          kind = Kind.FLOAT;
        }
        const literal = {
          kind,
          value,
        };

        expect(GraphQLDecimal.parseLiteral(literal as ValueNode, {})).to.equal(
          expected
        );
      });
    });

    INVALID_DECIMALS.forEach((value) => {
      it(`returns null when passing ${JSON.stringify(value)}`, () => {
        let kind: KindEnum = Kind.STRING;
        if (_.isInteger(value)) {
          kind = Kind.INT;
        } else if (_.isNumber(value)) {
          kind = Kind.FLOAT;
        }
        const literal = {
          kind,
          value,
        };

        expect(GraphQLDecimal.parseLiteral(literal as ValueNode, {})).to.equal(
          null
        );
      });
    });

    const invalidLiterals = [
      { kind: Kind.BOOLEAN, value: true },
      { kind: Kind.ENUM, value: 'TEST' },
      { kind: Kind.LIST, value: [] },
    ];
    invalidLiterals.forEach((literal) => {
      it(`returns null when parsing invalid literal ${JSON.stringify(
        literal
      )}`, () => {
        expect(GraphQLDecimal.parseLiteral(literal as ValueNode, {})).to.equal(
          null
        );
      });
    });
  });
});
