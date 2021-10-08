/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { FieldConfigMap } from './FieldConfig';
import { GraphQLTypeResolver } from 'graphql';
import Context from '../context';
import { TypeKind } from './TypeKind';

export type InterfaceTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.INTERFACE;
  /**
   * An array of input arguments for the field
   */
  fields: FieldConfigMap;
  /**
   * Function to resolve the type
   */
  resolveType?: GraphQLTypeResolver<any, Context>;
};
