/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const ValidateRegexDirective = {
  name: 'validateRegex',
  description: 'Adds regular expression validation to a field',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    pattern: {
      typeName: 'String',
      required: true,
      description:
        'Regular expression pattern that the values is matched against',
    },
  },
};
