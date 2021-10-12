/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const InputDirective = {
  name: 'input',
  description: 'Set the default input element for the field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    type: {
      typeName: 'InputElementType',
      required: true,
      description: 'The input element type',
    },
  },
};
