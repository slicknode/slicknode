/**
 * Created by Ivo Meißner on 29.09.17.
 *
 */

import { ProjectChangeType } from './ProjectChangeType';

export type ProjectChange = {
  // Description of the change
  description: string;
  // ID of the app
  app?: string;
  // The path to the object that is changed. For example `[ "types", "TypeName", "fieldName" ]`
  path?: Array<string>;
  // The change of the type
  type: ProjectChangeType;
  // Weather the change is breaking
  breaking?: boolean;
};
