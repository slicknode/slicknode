/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ConnectionValidFieldName from '../ConnectionValidFieldName';
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

describe('Validate ConnectionValidFieldName', () => {
  it('succeeds for valid type via edge', () => {
    expectReportsErrors(
      ConnectionValidFieldName,
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
      ConnectionValidFieldName,
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

  it('fails for reserved field name', () => {
    expectReportsErrors(
      ConnectionValidFieldName,
      [
        createTestModule({
          namespace: 'NS',
          types: types.map((type) => _.omit(type, 'handler')),
          connections: [
            {
              name: 'cursor',
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
        'Relation error on field NS_Group.cursor: Cannot use reserved field name "cursor"',
      ]
    );
  });

  it('fails for invalid format', () => {
    const invalidNames = [
      '0fdh',
      'Uppercase',
      '9',
      '_private',
      '_Private',
      '/()',
      '',
    ];
    invalidNames.forEach((name) => {
      expectReportsErrors(
        ConnectionValidFieldName,
        [
          createTestModule({
            namespace: 'NS',
            types: types.map((type) => _.omit(type, 'handler')),
            connections: [
              {
                name,
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
        [`Relation error on field NS_Group.${name}: Invalid field name format`]
      );
    });
  });

  it('fails for missing namespace across modules', () => {
    expectReportsErrors(
      ConnectionValidFieldName,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'connField',
              source: {
                typeName: 'Other_Group',
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
        createTestModule({
          namespace: 'Other',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'Other_Group',
              fields: {
                id: {
                  typeName: 'ID',
                  required: true,
                },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      [
        'Connection field to a type of another module has to start with namespace "NS_"',
      ]
    );
  });

  it('succeeds for namespace across modules', () => {
    expectReportsErrors(
      ConnectionValidFieldName,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'NS_connField',
              source: {
                typeName: 'Other_Group',
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
        createTestModule({
          namespace: 'Other',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'Other_Group',
              fields: {
                id: {
                  typeName: 'ID',
                  required: true,
                },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });
});
