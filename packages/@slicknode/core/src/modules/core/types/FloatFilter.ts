/**
 * Created by Ivo Meißner on 03.03.17.
 *
 */

import { InputObjectTypeConfig, TypeKind } from '../../../definition';

const FloatFilter: InputObjectTypeConfig = {
  kind: TypeKind.INPUT_OBJECT,
  name: 'FloatFilter',
  description: 'The filter for string fields',
  fields: {
    eq: {
      typeName: 'Float',
      required: false,
      description: 'Field is equal to the provided value',
    },
    notEq: {
      typeName: 'Float',
      required: false,
      description: 'Field is not equal to the provided value',
    },
    in: {
      typeName: 'Float',
      required: false,
      list: true,
      description: 'Field value is equal to one of the given values',
    },
    notIn: {
      typeName: 'Float',
      required: false,
      list: true,
      description: 'Field value is not equal to any of the given values',
    },
    gt: {
      typeName: 'Float',
      required: false,
      description: 'Field is greater than the provided value',
    },
    gte: {
      typeName: 'Float',
      required: false,
      description: 'Field is greater than or equal to the provided value',
    },
    lt: {
      typeName: 'Float',
      required: false,
      description: 'Field is less than the provided value',
    },
    lte: {
      typeName: 'Float',
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

export default FloatFilter;
