/**
 * Created by Ivo Meißner on 29.09.17.
 *
 * @flow
 */

export interface IProjectChange {
  description: string;
  path: string[];
  module?: string;
  breaking: boolean;
  type: 'REMOVE' | 'ADD' | 'UPDATE';
}
