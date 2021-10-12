/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */

import { ObjectTypeConfig, TypeKind } from '../../../definition';

const Viewer: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'Viewer',
  description: 'The current viewer',
  fields: {},
  permissions: [],
};

export default Viewer;
