/**
 * Created by Ivo Meißner on 23.04.17.
 *
 */

import { PageConfig, PageKind } from '../../../../../definition';

const pages: Array<PageConfig> = [
  {
    name: 'Locales',
    kind: PageKind.OBJECT_TYPE,
    typeName: 'Locale',
  },
  {
    name: 'Status',
    kind: PageKind.OBJECT_TYPE,
    typeName: 'ContentStatus',
  },
];

export default pages;
