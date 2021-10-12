/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */
import { DirectiveLocation } from 'graphql';

export const RelationDirective = {
  name: 'relation',
  description: 'Define a relation between the field and other nodes',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  arguments: {
    path: {
      typeName: 'String',
      required: true,
      description: 'The path between the related objects',
    },
  },
};
