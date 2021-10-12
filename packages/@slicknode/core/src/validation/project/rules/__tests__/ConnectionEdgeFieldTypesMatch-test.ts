/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ConnectionEdgeFieldTypesMatch from '../ConnectionEdgeFieldTypesMatch';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind, TypeConfig } from '../../../../definition';

const types: TypeConfig[] = [
  {
    kind: TypeKind.OBJECT,
    name: 'NS_Group',
    description: 'Group',
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
    name: 'NS_RemoteMultiExtension',
    description: 'Add 1:n relation to Remote type',
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      key: {
        typeName: 'String',
        required: true,
      },
    },
    interfaces: ['Node'],
  },
  {
    kind: TypeKind.OBJECT,
    name: 'NS_RemoteMembership',
    description: 'Add 1:n relation to Remote type',
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      key: {
        typeName: 'String',
        required: true,
      },
      group: {
        typeName: 'NS_RemoteGroup',
        required: true,
      },
    },
    interfaces: ['Node'],
  },
  {
    kind: TypeKind.OBJECT,
    name: 'NS_RemoteGroup',
    description: 'Add 1:n relation to Remote type',
    fields: {
      id: {
        typeName: 'ID',
        required: true,
      },
      key: {
        typeName: 'String',
        required: true,
      },
    },
    interfaces: ['Node'],
  },
  {
    kind: TypeKind.INTERFACE,
    name: 'NamedInterface',
    description: 'Member',
    fields: {
      name: {
        typeName: 'String',
        required: false,
      },
    },
  },
];

describe('Validate ConnectionEdgeFieldTypesMatch', () => {
  it('succeeds for connection via edge', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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

  it('fails for unknown edge type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                typeName: 'InvalidType',
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
      ['The type of the edge "InvalidType" does not exist in the type system']
    );
  });

  it('fails for non object type edge', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                typeName: 'NamedInterface',
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
      ['The edge type "NamedInterface" has to be of type object']
    );
  });

  it('fails for wrong edge source field type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                sourceField: 'id',
              },
              node: {
                typeName: 'NS_Member',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      ['The source field of the edge has to be of type NS_Group']
    );
  });

  it('fails for wrong edge node field type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                nodeField: 'id',
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
      ['The node field of the edge has to be of type NS_Member']
    );
  });

  it('fails for wrong inline node field type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                sourceField: 'id',
              },
              node: {
                typeName: 'NS_Membership',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      ['The source field of the edge has to be of type NS_Group']
    );
  });

  it('fails for wrong inline node type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                sourceField: 'id',
              },
              node: {
                typeName: 'NamedInterface',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      ['The node type "NamedInterface" has to be of type object']
    );
  });

  it('fails for unknown key field on source', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_Group',
                keyField: 'unknownSourceKeyField',
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
      [' The field "unknownSourceKeyField" does not exist on type NS_Group']
    );
  });

  it('fails for unknown key field on node', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                keyField: 'unknownNodeKeyField',
              },
            },
          ],
        }),
      ],
      [' The field "unknownNodeKeyField" does not exist on type NS_Membership']
    );
  });

  it('fails for unknown source type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NS_GroupUnknown',
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
      [' The source type "NS_GroupUnknown" does not exist in type system']
    );
  });

  it('fails for unknown node type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
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
                typeName: 'NS_MembershipUnknown',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      [' The node type "NS_MembershipUnknown" does not exist in type system']
    );
  });

  it('fails for invalid source type', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'NamedInterface',
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
      [' The source type "NamedInterface" has to be of type object']
    );
  });

  it('succeeds for connection on remote module types', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'Remote',
          remoteModule: {
            endpoint: 'http://localhost',
          },
          rawSchema: `
        type Query {
          test: TestType
        }
        
        type TestType {
          id: ID!
          key: String
        }
        `,
        }),
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'Remote_TestType',
                keyField: 'key',
              },
              edge: {
                sourceField: 'name',
              },
              node: {
                typeName: 'NS_Group',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('succeeds for 1:n connection on remote module types with ID to String connection', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'Remote',
          remoteModule: {
            endpoint: 'http://localhost',
          },
          rawSchema: `
        type Query {
          test: TestType
        }
        
        type TestType {
          id: ID!
          key: ID
        }
        `,
        }),
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'Remote_TestType',
                keyField: 'key',
              },
              edge: {
                sourceField: 'key',
              },
              node: {
                typeName: 'NS_RemoteMultiExtension',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('succeeds for n:m connection on remote module types with ID to String connection', () => {
    expectReportsErrors(
      ConnectionEdgeFieldTypesMatch,
      [
        createTestModule({
          namespace: 'Remote',
          remoteModule: {
            endpoint: 'http://localhost',
          },
          rawSchema: `
        type Query {
          test: TestType
        }
        
        type TestType {
          id: ID!
          key: ID
        }
        `,
        }),
        createTestModule({
          namespace: 'NS',
          types,
          connections: [
            {
              name: 'members',
              source: {
                typeName: 'Remote_TestType',
                keyField: 'key',
              },
              edge: {
                sourceField: 'key',
                typeName: 'NS_RemoteMembership',
                nodeField: 'group',
              },
              node: {
                typeName: 'NS_RemoteGroup',
                keyField: 'id',
              },
            },
          ],
        }),
      ],
      []
    );
  });
});
