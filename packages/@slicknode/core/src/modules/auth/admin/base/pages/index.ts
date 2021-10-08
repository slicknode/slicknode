/**
 * Created by Ivo Meißner on 23.04.17.
 *
 */

import { PageConfig } from '../../../../../definition';
import { PageKind } from '../../../../../definition';

const pages: Array<PageConfig> = [
  {
    name: 'Users',
    kind: PageKind.OBJECT_TYPE,
    typeName: 'User',
  },
  {
    name: 'Logins',
    kind: PageKind.OBJECT_TYPE,
    typeName: 'Login',
  },
];

export default pages;
