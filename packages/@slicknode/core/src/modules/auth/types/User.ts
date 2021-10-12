/**
 * Created by Ivo Meißner on 13.12.16.
 *
 */

import {
  FieldAccess,
  InputElementType,
  ObjectTypeConfig,
  TypeKind,
} from '../../../definition';
import TimeStampedInterface from '../../core/types/TimeStampedInterface';
import Node from '../../relay/types/Node';
import { HANDLER_POSTGRES } from '../../../schema/handler';
import { Role } from '../../../auth';

/* eslint-disable max-len */
const User: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: 'User',
  handler: {
    kind: HANDLER_POSTGRES,
  },
  description: 'A user of the project',
  fields: {
    ...Node.fields,
    firstName: {
      typeName: 'String',
      required: false,
      description: 'The first name of the user',
      validators: [
        {
          type: 'length',
          config: {
            max: 128,
          },
        },
      ],
      sanitizers: [{ type: 'trim' }],
    },
    lastName: {
      typeName: 'String',
      required: false,
      description: 'The last name of the user',
      validators: [
        {
          type: 'length',
          config: {
            max: 128,
          },
        },
      ],
      sanitizers: [{ type: 'trim' }],
    },
    email: {
      typeName: 'String',
      required: false,
      unique: true,
      index: true,
      description: 'Email address of the user',
      validators: [
        {
          type: 'email',
        },
      ],
      sanitizers: [{ type: 'normalizeEmail' }],
    },
    username: {
      typeName: 'String',
      required: false,
      unique: true,
      index: true,
      description: 'Username of the user',
      validators: [
        {
          type: 'length',
          config: {
            max: 128,
          },
        },
      ],
      sanitizers: [{ type: 'normalizeEmail' }],
    },
    isActive: {
      typeName: 'Boolean',
      required: true,
      defaultValue: true,
      description: 'Indicates if the user is active',
    },
    isStaff: {
      typeName: 'Boolean',
      required: true,
      defaultValue: false,
      description: 'Indicates if the user is a staff user',
    },
    isAdmin: {
      typeName: 'Boolean',
      required: true,
      defaultValue: false,
      description: 'Indicates if the user is an admin user',
    },
    lastLogin: {
      typeName: 'DateTime',
      description: 'The last time the user logged into the system',
      access: [FieldAccess.READ],
    },
    password: {
      typeName: 'String',
      required: false,
      description: 'The password to log in',
      validators: [
        {
          type: 'length',
          message:
            'Please enter a strong password. It needs to be at least 8 characters long.',
          config: {
            min: 8,
          },
        },
      ],
      inputElementType: InputElementType.PASSWORD,
      access: [FieldAccess.CREATE, FieldAccess.UPDATE],
    },
    passwordChanged: {
      typeName: 'DateTime',
      required: false,
      description: 'Time when the password was last changed',
      access: [FieldAccess.READ],
    },
    ...TimeStampedInterface.fields,
  },
  permissions: [
    // Staff is allowed everything
    { role: Role.STAFF },
    { role: Role.ADMIN },
    { role: Role.RUNTIME },

    // User can see himself
    {
      role: Role.AUTHENTICATED,
      query:
        'query PermissionQuery($user_id: ID!) {node(filter: {id: {eq: $user_id}})}',
      fields: ['id', 'firstName', 'lastName', 'locale', 'email'],
    },
  ],
  mutations: {
    create: [
      // Staff users can add Non-Staff users
      {
        role: Role.STAFF,
        query:
          'query PermissionQuery {node(filter: {isAdmin: false, isStaff: false})}',
      },
      {
        role: Role.ADMIN,
      },
      {
        role: Role.RUNTIME,
      },
    ],
    update: [
      {
        role: Role.STAFF,
        query:
          'query PermissionQuery {node(filter: {isAdmin: false, isStaff: false})}',
      },
      {
        role: Role.ADMIN,
      },
      {
        role: Role.RUNTIME,
      },
    ],
    delete: [
      {
        role: Role.STAFF,
        query:
          'query PermissionQuery {node(filter: {isAdmin: false, isStaff: false})}',
      },
      {
        role: Role.ADMIN,
        query:
          'query PermissionQuery($user_id: ID!) {node(filter: {id: {notEq: $user_id}})}',
      },
      {
        role: Role.RUNTIME,
      },
    ],
  },
  interfaces: ['Node', 'TimeStampedInterface'],
  autoCompleteFields: ['firstName', 'lastName', 'username', 'email'],
};

export default User;
