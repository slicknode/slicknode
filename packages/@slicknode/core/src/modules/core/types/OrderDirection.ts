/**
 * Created by Ivo Meißner on 14.04.17.
 *
 */

import { EnumTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';

const OrderDirection: EnumTypeConfig = {
  kind: TypeKind.ENUM,
  name: 'OrderDirection',
  description: 'The sorting order of a set of nodes',
  values: {
    ASC: {
      description: 'Sorts the nodes in ascending order',
      value: 'ASC',
    },
    DESC: {
      description: 'Sorts the nodes in descending order',
      value: 'DESC',
    },
  },
};

export default OrderDirection;
