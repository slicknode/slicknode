import { FieldAccess, ObjectTypeConfig, TypeKind } from '../../../definition';
import Node from '../../relay/types/Node';
import { Role } from '../../../auth';
import { HANDLER_POSTGRES } from '../../../schema/handler';

const Locale: ObjectTypeConfig = {
  name: 'Locale',
  kind: TypeKind.OBJECT,
  handler: {
    kind: HANDLER_POSTGRES,
  },
  fields: {
    ...Node.fields,
    name: {
      typeName: 'String',
      required: true,
      description: 'Name of the locale',
    },
    code: {
      typeName: 'String',
      required: true,
      unique: true,
      description: 'ISO 639-1 locale code',
      validators: [
        {
          type: 'regex',
          config: {
            pattern: '^[a-z]{2,3}(?:-[A-Z]{2,3}(?:-[a-zA-Z]{4})?)?$',
          },
        },
      ],
    },
    isActive: {
      typeName: 'Boolean',
      required: true,
      description: 'True if locale is currently active.',
    },
    isDefault: {
      typeName: 'Boolean',
      required: true,
      defaultValue: false,
      description: 'Locale is used if no other locale is specified',
      access: [FieldAccess.READ],
    },
  },
  interfaces: ['Node'],
  autoCompleteFields: ['name', 'code'],
  permissions: [
    // Everyone can read locales
    { role: Role.ANONYMOUS },
  ],
  mutations: {
    create: [
      {
        role: Role.ADMIN,
        query: 'query PermissionQuery {node(filter: {isDefault: false})}',
      },
    ],
    update: [
      {
        role: Role.ADMIN,
      },
    ],
    delete: [
      {
        role: Role.ADMIN,
        query: 'query PermissionQuery {node(filter: {isDefault: false})}',
      },
    ],
  },
};

export default Locale;
