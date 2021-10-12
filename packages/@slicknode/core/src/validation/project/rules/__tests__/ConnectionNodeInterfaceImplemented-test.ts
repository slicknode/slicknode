/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ConnectionNodeInterfaceImplemented from '../ConnectionNodeInterfaceImplemented';
import { expectReportsErrors, createTestModule } from './utils';
import { ObjectTypeConfig, TypeKind } from '../../../../definition';
import { HANDLER_POSTGRES } from '../../../../schema/handler';
import _ from 'lodash';

const types: ObjectTypeConfig[] = [
  {
    kind: TypeKind.OBJECT,
    name: 'NS_Group',
    description: 'Group',
    handler: {
      kind: HANDLER_POSTGRES,
    },
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      name: {
        typeName: 'String',
        required: false,
      },
    },
    interfaces: ['Node'],
  },
  {
    kind: TypeKind.OBJECT,
    name: 'NS_Membership',
    description: 'Membership',
    handler: {
      kind: HANDLER_POSTGRES,
    },
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      group: {
        typeName: 'NS_Group',
        required: false,
      },
      member: {
        typeName: 'NS_Member',
        required: false,
      },
    },
    interfaces: ['Node'],
  },
  {
    kind: TypeKind.OBJECT,
    name: 'NS_Member',
    description: 'Member',
    handler: {
      kind: HANDLER_POSTGRES,
    },
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      name: {
        typeName: 'String',
        required: false,
      },
    },
    interfaces: ['Node'],
  },
];

describe('Validate ConnectionNodeInterfaceImplemented', () => {
  it('succeeds for valid type via edge', () => {
    expectReportsErrors(
      ConnectionNodeInterfaceImplemented,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_Group',
                keyField: 'id',
              },
              edge: {
                typeName: 'NS_Membership',
                nodeField: 'member',
                sourceField: 'group',
              },
              node: {
                typeName: 'NS_Member',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('succeeds for valid handler + inline node', () => {
    expectReportsErrors(
      ConnectionNodeInterfaceImplemented,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_Group',
                keyField: 'id',
              },
              edge: {
                sourceField: 'group',
              },
              node: {
                typeName: 'NS_Membership',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for invalid handler + inline node', () => {
    expectReportsErrors(
      ConnectionNodeInterfaceImplemented,
      [
        createTestModule({
          namespace: 'NS',
          types: types.map((type) => _.omit(type, 'interfaces')),
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_Group',
                keyField: 'id',
              },
              edge: {
                sourceField: 'group',
              },
              node: {
                typeName: 'NS_Membership',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      [
        'Relation error on field NS_Group.members: The target of a relation has to be a valid Node',
      ]
    );
  });

  it('fails for invalid type via edge', () => {
    expectReportsErrors(
      ConnectionNodeInterfaceImplemented,
      [
        createTestModule({
          namespace: 'NS',
          types: types.map((type) => _.omit(type, 'interfaces')),
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_Group',
                keyField: 'id',
              },
              edge: {
                typeName: 'NS_Membership',
                nodeField: 'member',
                sourceField: 'group',
              },
              node: {
                typeName: 'NS_Member',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      [
        'Relation error on field NS_Group.members: The target of a relation has to be a valid Node',
      ]
    );
  });
});
