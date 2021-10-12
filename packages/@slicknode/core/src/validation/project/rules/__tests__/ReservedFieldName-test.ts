/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ReservedFieldName from '../ReservedFieldName';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';
import { RESERVED_FIELD_NAMES } from '../../../../schema/identifiers';

describe('Validate ReservedFieldName', () => {
  it('tests fields for reserved field names on Node types', () => {
    RESERVED_FIELD_NAMES.forEach((name) => {
      expectReportsErrors(
        ReservedFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  [name]: {
                    typeName: 'String',
                  },
                },
                interfaces: ['Node'],
              },
            ],
          }),
        ],
        [
          `"${name}" is a reserved field name. Choose a different name for the field on type TestType`,
        ]
      );
    });
  });

  it('tests fields for reserved field names on non Nodes', () => {
    RESERVED_FIELD_NAMES.forEach((name) => {
      expectReportsErrors(
        ReservedFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  [name]: {
                    typeName: 'String',
                  },
                },
              },
            ],
          }),
        ],
        []
      );
    });
  });

  it('tests fields for reserved field names via related field on non Nodes', () => {
    RESERVED_FIELD_NAMES.forEach((name) => {
      expectReportsErrors(
        ReservedFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  test: {
                    typeName: 'String',
                  },
                },
              },
            ],
            typeExtensions: {
              TestType: {
                [name]: {
                  typeName: 'String',
                },
              },
            },
          }),
        ],
        []
      );
    });
  });

  it('tests fields for reserved field names via related field on Nodes', () => {
    RESERVED_FIELD_NAMES.forEach((name) => {
      expectReportsErrors(
        ReservedFieldName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name: 'TestType',
                description: 'A user of the project',
                fields: {
                  test: {
                    typeName: 'String',
                  },
                },
                interfaces: ['Node'],
              },
            ],
            typeExtensions: {
              TestType: {
                [name]: {
                  typeName: 'String',
                },
              },
            },
          }),
        ],
        [
          `"${name}" is a reserved field name. Choose a different name for the field on type TestType`,
        ]
      );
    });
  });

  it('succeeds for non reserved field names', () => {
    expectReportsErrors(
      ReservedFieldName,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                name: {
                  typeName: 'String',
                },
              },
            },
          ],
        }),
      ],
      []
    );
  });
});
