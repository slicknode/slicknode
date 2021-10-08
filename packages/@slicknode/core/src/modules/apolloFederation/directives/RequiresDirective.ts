/**
 * Created by Ivo Meißner on 2019-07-24
 *
 */
import { DirectiveLocation } from 'graphql';

export const RequiresDirective = {
  name: 'requires',
  description:
    'This directive is used to annotate the required input fieldset from a base type for a resolver. ' +
    'It is used to develop a query plan where the required fields may not be needed by the client, ' +
    'but the service may need additional information from other services.',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    fields: {
      typeName: '_FieldSet',
      required: true,
    },
  },
};
