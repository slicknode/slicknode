/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { GraphQLNamedType } from 'graphql';

import { BaseTypeConfig } from './BaseTypeConfig';
import { TypeKind } from './TypeKind';

export type ScalarTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.SCALAR;
  /**
   * Scalar has to be defined in JS
   */
  type: GraphQLNamedType;
};
