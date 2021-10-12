/**
 * Created by Ivo Meißner on 03.03.17.
 *
 */

import { InputObjectTypeConfig, TypeKind } from '../../../definition';

const IDFilter: InputObjectTypeConfig = {
  kind: TypeKind.INPUT_OBJECT,
  name: 'IDFilter',
  description: 'The filter for string fields',
  fields: {
    eq: {
      typeName: 'ID',
      required: false,
      description: 'Field is equal to the provided value',
    },
    notEq: {
      typeName: 'ID',
      required: false,
      description: 'Field is not equal to the provided value',
    },
    in: {
      typeName: 'ID',
      required: false,
      list: true,
      description: 'Field value is equal to one of the given values',
    },
    notIn: {
      typeName: 'ID',
      required: false,
      list: true,
      description: 'Field value is not equal to any of the given values',
    },
    gt: {
      typeName: 'ID',
      required: false,
      description: 'Field is greater than the provided value',
    },
    gte: {
      typeName: 'ID',
      required: false,
      description: 'Field is greater than or equal ot the provided value',
    },
    lt: {
      typeName: 'ID',
      required: false,
      description: 'Field is less than the provided value',
    },
    lte: {
      typeName: 'ID',
      required: false,
      description: 'Field is less than or equal ot the provided value',
    },
    isNull: {
      typeName: 'Boolean',
      required: false,
      description: 'Field has no value',
    },
  },
};

export default IDFilter;
