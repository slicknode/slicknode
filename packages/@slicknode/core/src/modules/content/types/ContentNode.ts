import { ObjectTypeConfig, TypeKind } from '../../../definition';
import Node from '../../relay/types/Node';
import { Role } from '../../../auth';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import { FieldStorageType } from '../../../definition/FieldStorageType';

const ContentNode: ObjectTypeConfig = {
  name: 'ContentNode',
  kind: TypeKind.OBJECT,
  handler: {
    kind: HANDLER_POSTGRES,
  },
  fields: {
    id: {
      ...Node.fields.id,
      storageType: FieldStorageType.UUID,
    },
    type: {
      typeName: 'String',
      required: true,
      description: 'The node type that the ContentNode belongs to',
    },
  },
  interfaces: ['Node'],
  permissions: [
    { role: Role.ANONYMOUS }, // Permissions are enforced on the individual type level
    { role: Role.ADMIN },
    { role: Role.STAFF },
    { role: Role.AUTHENTICATED },
    { role: Role.RUNTIME },
  ],
  mutations: {},
  directAccess: false,
};

export default ContentNode;
