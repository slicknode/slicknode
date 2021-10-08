/**
 * Created by Ivo Meißner on 03.03.17.
 *
 */

import { InputObjectTypeConfig, TypeKind } from '../../../definition';

const StringFilter: InputObjectTypeConfig = {
  kind: TypeKind.INPUT_OBJECT,
  name: 'StringFilter',
  description: 'The filter for string fields',
  fields: {
    eq: {
      typeName: 'String',
      required: false,
      description: 'Field is equal to the provided value',
    },
    notEq: {
      typeName: 'String',
      required: false,
      description: 'Field is not equal to the provided value',
    },
    in: {
      typeName: 'String',
      required: false,
      list: true,
      description: 'Field value is equal to one of the given values',
    },
    notIn: {
      typeName: 'String',
      required: false,
      list: true,
      description: 'Field value is not equal to any of the given values',
    },
    gt: {
      typeName: 'String',
      required: false,
      description: 'Field is greater than the provided value',
    },
    gte: {
      typeName: 'String',
      required: false,
      description: 'Field is greater than or equal ot the provided value',
    },
    lt: {
      typeName: 'String',
      required: false,
      description: 'Field is less than the provided value',
    },
    lte: {
      typeName: 'String',
      required: false,
      description: 'Field is less than or equal ot the provided value',
    },
    isNull: {
      typeName: 'Boolean',
      required: false,
      description: 'Field has no value',
    },
    startsWith: {
      typeName: 'String',
      required: false,
      description: 'Field value starts with the provided string',
    },
    endsWith: {
      typeName: 'String',
      required: false,
      description: 'Field value ends with the provided string',
    },
    contains: {
      typeName: 'String',
      required: false,
      description: 'Field value contains the provided string',
    },
  },
};

export default StringFilter;
