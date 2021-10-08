/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const ValidateLengthDirective = {
  name: 'validateLength',
  description: 'Adds length validation to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    min: {
      typeName: 'Int',
      required: false,
      description: 'The minimum length of the value',
    },
    max: {
      typeName: 'Int',
      required: false,
      description: 'The maximum length of the value',
    },
  },
};
