/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const ValidateUrlDirective = {
  name: 'validateUrl',
  description: 'Adds url validation to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
};
