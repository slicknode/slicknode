/**
 * Created by Ivo Meißner on 2019-07-24
 *
 */
import { DirectiveLocation } from 'graphql';

export const ExternalDirective = {
  name: 'external',
  description:
    'This directive is used to mark a field as owned by another service. ' +
    'This allows service A to use fields from service B while also knowing ' +
    'at runtime the types of that field.',
  locations: [DirectiveLocation.FIELD_DEFINITION],
};
