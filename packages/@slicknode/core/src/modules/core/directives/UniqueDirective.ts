/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const UniqueDirective = {
  name: 'unique',
  description: 'Adds a unique constraint to the field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
};
