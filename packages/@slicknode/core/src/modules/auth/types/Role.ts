/**
 * Created by Ivo Meißner on 14.02.17.
 *
 */

import { EnumTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';
import RoleType from '../../../auth/RoleType';

const Role: EnumTypeConfig = {
  kind: TypeKind.ENUM,
  name: 'Role',
  type: RoleType,
  values: {},
};

export default Role;
