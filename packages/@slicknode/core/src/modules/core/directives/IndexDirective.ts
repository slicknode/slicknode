/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const IndexDirective = {
  name: 'index',
  description: 'Adds an index to the database for the type',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    fields: {
      typeName: 'String',
      required: false,
      list: [true],
      description: 'The fields that are included in the index',
    },
    unique: {
      typeName: 'Boolean',
      required: false,
      description: 'Create a unique index',
    },
  },
  isRepeatable: true,
};
