/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';
import { DirectiveConfig } from '../../../definition';

export const AutocompleteDirective: DirectiveConfig = {
  name: 'autocomplete',
  description:
    'Adds an autocomplete index to the database for the type on the given fields',
  locations: [DirectiveLocation.OBJECT],
  arguments: {
    fields: {
      typeName: 'String',
      required: true,
      list: true,
      description: 'The fields that are included in the autocomplete index',
    },
  },
};
