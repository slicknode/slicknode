/**
 * Created by Ivo Meißner on 30.11.16.
 *
 */

import {
  FieldAccess,
  InterfaceTypeConfig,
  TypeKind,
} from '../../../definition';
import { defaultTypeResolver } from '../../../schema/resolvers';

/* eslint-disable max-len */
export const TimeStampedInterface: InterfaceTypeConfig = {
  name: 'TimeStampedInterface',
  description:
    'Interface for objects that automatically get timestamped values',
  fields: {
    createdAt: {
      typeName: 'DateTime',
      required: true,
      defaultValue: 'now',
      index: true,
      description: 'The time when the object was first added',
      access: [FieldAccess.READ],
    },
    lastUpdatedAt: {
      typeName: 'DateTime',
      index: true,
      description: 'The time when the object was last updated',
      access: [FieldAccess.READ],
    },
  },
  kind: TypeKind.INTERFACE,
  resolveType: defaultTypeResolver,
};

export default TimeStampedInterface;
