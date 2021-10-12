/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { BasePageConfig } from './BasePageConfig';
import { PageKind } from './PageKind';

export type PageObjectTypeConfig = BasePageConfig & {
  /**
   * The kind of the page
   */
  kind: PageKind.OBJECT_TYPE;
  /**
   * The name of the object type
   */
  typeName: string;
};
