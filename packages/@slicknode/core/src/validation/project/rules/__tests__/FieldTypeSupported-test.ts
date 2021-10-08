/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import FieldTypeSupported from '../FieldTypeSupported';
import { baseModules } from '../../../../modules';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate FieldTypeSupported', () => {
  it('fails for unknown type', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'unknownType',
                  required: false,
                },
              },
            },
          ],
        }),
      ],
      ['Type "unknownType" for field "firstName" not found in schema']
    );
  });

  it('passes for builtin types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'String', required: false },
                fieldFloat: { typeName: 'Float', required: false },
                fieldInt: { typeName: 'Int', required: false },
                fieldBoolean: { typeName: 'Boolean', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for custom scalars', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        ...baseModules,
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'DateTime', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for ID type on non "id" fields of non Node types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'ID', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for ID type on non "id" fields of input types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'ID', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for ID type on non "id" fields of Node types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'ID', required: false },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      [
        'Type "ID" is reserved for field "id" on object types with interface "Node"',
      ]
    );
  });

  it('passes for Enum type fields', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'EnumType', required: false },
              },
            },
            {
              kind: TypeKind.ENUM,
              name: 'EnumType',
              description: 'Test Enum',
              values: {
                TEST: {
                  description: 'Test value',
                  value: 'test',
                },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for object types without Node interface on Nodes', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                ref: { typeName: 'RefTestType', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'RefTestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
          ],
        }),
      ],
      [
        'Using object types without Node interface as field types is not supported yet. "RefTestType" is missing Node interface',
      ]
    );
  });

  it('passes for object types without Node interface on non Node object types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                ref: { typeName: 'RefTestType', required: false },
              },
            },
            {
              kind: TypeKind.OBJECT,
              name: 'RefTestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for object types with Node interface', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                ref: { typeName: 'RefTestType', required: false },
              },
            },
            {
              kind: TypeKind.OBJECT,
              name: 'RefTestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'String', required: false },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for list types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'String', required: false, list: true },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      [
        'List type is not supported yet for field "fieldID". Use relations to model array values',
      ]
    );
  });

  it('passes for list types with custom resolver', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          resolvers: {
            TestType: {
              fieldID: {
                handler: 'dist/resolvers/test.js',
              },
            },
          },
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'String', required: false, list: true },
              },
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for list types with Content interface', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'TestType', required: false, list: true },
              },
              interfaces: ['Node', 'Content'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for list types with Content interface with multi dimensional array', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: {
                  typeName: 'TestType',
                  required: false,
                  list: [true, true],
                },
              },
              interfaces: ['Node', 'Content'],
            },
          ],
        }),
      ],
      [
        'Only one dimensional lists with non-NULL values are supported for field "fieldID", should be: fieldID: [TestType!]',
      ]
    );
  });

  it('fails for list types with Content interface with multi dimensional array, required', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: {
                  typeName: 'TestType',
                  required: true,
                  list: [true, true],
                },
              },
              interfaces: ['Node', 'Content'],
            },
          ],
        }),
      ],
      [
        'Only one dimensional lists with non-NULL values are supported for field "fieldID", should be: fieldID: [TestType!]!',
      ]
    );
  });

  it('passes for list types on non Node object types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'String', required: false, list: true },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for list types on non Node object types via related field', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
              },
            },
            {
              kind: TypeKind.OBJECT,
              name: 'TestType2',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
              },
              interfaces: ['Node'],
            },
          ],
          typeExtensions: {
            TestType: {
              fieldID: { typeName: 'String', required: false, list: true },
            },
          },
        }),
      ],
      []
    );
  });

  it('fails for interface types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'TestInterface', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.INTERFACE,
              name: 'TestInterface',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              resolveType: () => '',
            },
          ],
        }),
      ],
      [
        'Interface types as field types are not supported yet. Invalid type "TestInterface" for field "fieldID"',
      ]
    );
  });

  it('passes for interface types with custom resolver', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          resolvers: {
            TestType: {
              fieldID: {
                handler: 'resolver.js',
              },
            },
          },
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'TestInterface', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.INTERFACE,
              name: 'TestInterface',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              resolveType: () => '',
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for input types on object type', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                fieldID: { typeName: 'TestInput', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestInput',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
          ],
        }),
      ],
      ['Type "TestInput" for field "fieldID" is not supported']
    );
  });

  it('passes for input types on input type', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'TestInput', required: true },
              },
            },
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestInput',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('passes for list input types on input type', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'TestInput', required: true, list: true },
              },
            },
            {
              kind: TypeKind.INPUT_OBJECT,
              name: 'TestInput',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for union types with non ContentNode types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: { typeName: 'UnionType', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      [
        'All members of a union type have to implement the "Content" interface. Invalid type "UnionType" for field "field"',
      ]
    );
  });

  it('passes for union types with ContentNode types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: { typeName: 'UnionType', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              interfaces: ['Node', 'Content'],
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      [
        // 'All members of a union type have to implement the "Content" interface. Invalid type "UnionType" for field "field"',
      ]
    );
  });

  it('passes for union type lists with ContentNode types', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: { typeName: 'UnionType', required: false, list: [true] },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              interfaces: ['Node', 'Content'],
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for union type lists with ContentNode types + NULL values', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: {
                  typeName: 'UnionType',
                  required: false,
                  list: [false],
                },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              interfaces: ['Node', 'Content'],
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      [
        'Only one dimensional lists with non-NULL values are supported for field "field", should be: field: [UnionType!]',
      ]
    );
  });

  it('fails for union type lists with ContentNode types multiple dimensions', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: {
                  typeName: 'UnionType',
                  required: false,
                  list: [true, true],
                },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
              interfaces: ['Node', 'Content'],
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      [
        'Only one dimensional lists with non-NULL values are supported for field "field", should be: field: [UnionType!]',
      ]
    );
  });

  it('passes for union types with custom resolver', () => {
    expectReportsErrors(
      FieldTypeSupported,
      [
        createTestModule({
          namespace: 'NS',
          resolvers: {
            TestType: {
              field: {
                handler: 'src/resolve',
              },
            },
          },
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID', required: true },
                field: { typeName: 'UnionType', required: false },
              },
              interfaces: ['Node'],
            },
            {
              kind: TypeKind.OBJECT,
              name: 'Type1',
              description: 'A user of the project',
              fields: {
                fieldID: { typeName: 'String', required: false },
              },
            },
            {
              kind: TypeKind.UNION,
              name: 'UnionType',
              description: 'A user of the project',
              typeNames: ['Type1'],
            },
          ],
        }),
      ],
      []
    );
  });
});
