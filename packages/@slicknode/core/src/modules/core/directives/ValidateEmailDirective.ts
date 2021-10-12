/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const ValidateEmailDirective = {
  name: 'validateEmail',
  description: 'Adds email validation to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
};
