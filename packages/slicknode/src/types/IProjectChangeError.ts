/**
 * Created by Ivo Meißner on 29.09.17.
 *
 * @flow
 */

export interface IProjectChangeError {
  description: string;
  path: string[];
  module?: string;
}
