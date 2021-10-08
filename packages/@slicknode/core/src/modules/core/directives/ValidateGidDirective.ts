/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const ValidateGidDirective = {
  name: 'validateGid',
  description: 'Adds global ID validation to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
};
