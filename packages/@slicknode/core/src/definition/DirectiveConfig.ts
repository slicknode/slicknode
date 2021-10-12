/**
 * Created by Ivo Meißner on 2019-07-11
 *
 */

import { ArgumentConfigMap } from './ArgumentConfig';
import { DirectiveLocationEnum } from 'graphql/language/directiveLocation';

export type DirectiveConfig = {
  /**
   * Name of the directive
   */
  name: string;
  /**
   * Description of the directive
   */
  description?: string;
  /**
   * Is repeatable on location
   */
  isRepeatable?: boolean;
  /**
   * Allowed directive locations
   */
  locations: Array<DirectiveLocationEnum>;
  /**
   * Input arguments
   */
  arguments?: ArgumentConfigMap;
};
