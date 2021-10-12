import { ObjectTypeConfig, TypeKind } from '../../../definition';
import Node from '../../relay/types/Node';
import { Role } from '../../../auth';
import { HANDLER_POSTGRES } from '../../../schema/handler';

const ContentStatus: ObjectTypeConfig = {
  name: 'ContentStatus',
  kind: TypeKind.OBJECT,
  handler: {
    kind: HANDLER_POSTGRES,
  },
  fields: {
    ...Node.fields,
    name: {
      typeName: 'String',
      required: true,
      unique: true,
      description: 'The name of the status',
      validators: [
        {
          type: 'regex',
          config: {
            pattern: '^[A-Z][_0-9A-Z]*$',
          },
        },
      ],
    },
    label: {
      typeName: 'String',
      required: true,
      description: 'The label of the status as displayed in the console',
    },
  },
  autoCompleteFields: ['label'],
  interfaces: ['Node'],
  permissions: [
    // Staff is allowed everything
    { role: Role.STAFF },
    { role: Role.RUNTIME },
  ],
  mutations: {
    create: [
      {
        role: Role.ADMIN,
        query:
          'query PermissionQuery {node(filter: {name: {notIn: ["PUBLISHED", "DRAFT"]}})}',
      },
    ],
    update: [
      {
        role: Role.ADMIN,
        query:
          'query PermissionQuery {node(filter: {name: {notIn: ["PUBLISHED", "DRAFT"]}})}',
      },
    ],
    delete: [
      {
        role: Role.ADMIN,
        query:
          'query PermissionQuery {node(filter: {name: {notIn: ["PUBLISHED", "DRAFT"]}})}',
      },
    ],
  },
};

export default ContentStatus;
