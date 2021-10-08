/**
 * Created by Ivo Meißner on 2019-07-24
 *
 */
import { DirectiveLocation } from 'graphql';

export const KeyDirective = {
  name: 'key',
  description:
    'This directive is used to indicate a combination of fields ' +
    'that can be used to uniquely identify and fetch an object or interface.',
  locations: [DirectiveLocation.OBJECT, DirectiveLocation.INTERFACE],
  arguments: {
    fields: {
      typeName: '_FieldSet',
      required: true,
    },
  },
};
