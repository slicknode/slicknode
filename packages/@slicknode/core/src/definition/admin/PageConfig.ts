/**
 * Created by Ivo Meißner on 07.04.17.
 *
 */

import { PageObjectTypeConfig } from './PageObjectTypeConfig';
import { PageKind } from './PageKind';

/**
 * @deprecated Use PageKind instead
 */
export const PAGE_KIND_OBJECT_TYPE = PageKind.OBJECT_TYPE;

/**
 * Union type of all possible page type configs
 */
export type PageConfig = PageObjectTypeConfig;
