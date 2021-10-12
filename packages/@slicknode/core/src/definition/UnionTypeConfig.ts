/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseTypeConfig } from './BaseTypeConfig';
import { GraphQLObjectType } from 'graphql';
import Context from '../context';
import { TypeKind } from './TypeKind';

export type UnionTypeConfig = BaseTypeConfig & {
  /**
   * The kind of the config
   */
  kind: TypeKind.UNION;
  /**
   * An array of all type names
   */
  typeNames: Array<string>;
  /**
   * Function to resolve the type
   */
  resolveType?: (value: any, context: Context) => GraphQLObjectType | null;
};
