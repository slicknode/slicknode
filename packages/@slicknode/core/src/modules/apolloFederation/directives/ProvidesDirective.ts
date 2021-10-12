/**
 * Created by Ivo Meißner on 2019-07-24
 *
 */
import { DirectiveLocation } from 'graphql';

export const ProvidesDirective = {
  name: 'provides',
  description:
    'This directive is used to annotate the expected returned fieldset from a ' +
    'field on a base type that is guaranteed to be selectable by the gateway. ',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    fields: {
      typeName: '_FieldSet',
      required: true,
    },
  },
};
