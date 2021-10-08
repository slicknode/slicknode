/**
 * Created by Ivo Meißner on 03.03.17.
 *
 */

import { InputObjectTypeConfig, TypeKind } from '../../../definition';

const DecimalFilter: InputObjectTypeConfig = {
  kind: TypeKind.INPUT_OBJECT,
  name: 'DecimalFilter',
  description: 'The filter for string fields',
  fields: {
    eq: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is equal to the provided value',
    },
    notEq: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is not equal to the provided value',
    },
    in: {
      typeName: 'Decimal',
      required: false,
      list: true,
      description: 'Field value is equal to one of the given values',
    },
    notIn: {
      typeName: 'Decimal',
      required: false,
      list: true,
      description: 'Field value is not equal to any of the given values',
    },
    gt: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is greater than the provided value',
    },
    gte: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is greater than or equal to the provided value',
    },
    lt: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is less than the provided value',
    },
    lte: {
      typeName: 'Decimal',
      required: false,
      description: 'Field is less than or equal to the provided value',
    },
    isNull: {
      typeName: 'Boolean',
      required: false,
      description: 'Field has no value',
    },
  },
};

export default DecimalFilter;
