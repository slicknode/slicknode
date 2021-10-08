import {
  InterfaceTypeConfig,
  TypeKind,
  FieldAccess,
} from '../../../definition';
import { defaultTypeResolver } from '../../../schema/resolvers';

const Content: InterfaceTypeConfig = {
  name: 'Content',
  description: 'Interface for content management enabled types',
  fields: {
    contentNode: {
      typeName: 'ContentNode',
      required: true,
      description:
        'The main content node that groups the nodes with individual translations',
      access: [FieldAccess.READ, FieldAccess.CREATE],
    },
    locale: {
      typeName: 'Locale',
      required: true,
      description: 'The locale of the content node',
      access: [FieldAccess.READ, FieldAccess.CREATE],
    },
    status: {
      typeName: 'ContentStatus',
      required: true,
      description: 'The current status of the node',
      access: [FieldAccess.READ],
    },
    publishedAt: {
      typeName: 'DateTime',
      required: false,
      description: 'The time when the node was last published',
      access: [FieldAccess.READ],
    },
    publishedBy: {
      typeName: 'User',
      required: false,
      description: 'The user that published the node',
      access: [FieldAccess.READ],
    },
    createdAt: {
      typeName: 'DateTime',
      required: true,
      defaultValue: 'now',
      index: true,
      description: 'The time when the object was first added',
      access: [FieldAccess.READ],
    },
    createdBy: {
      typeName: 'User',
      required: false,
      description: 'The user that created the node',
      access: [FieldAccess.READ],
    },
    lastUpdatedAt: {
      typeName: 'DateTime',
      index: true,
      description: 'The time when the object was last updated',
      access: [FieldAccess.READ],
    },
    lastUpdatedBy: {
      typeName: 'User',
      required: false,
      description: 'The user that last updated the node',
      access: [FieldAccess.READ],
    },
  },
  kind: TypeKind.INTERFACE,
  resolveType: defaultTypeResolver,
};

export default Content;
