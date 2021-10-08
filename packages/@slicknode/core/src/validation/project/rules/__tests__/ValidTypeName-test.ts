/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ValidateTypeName from '../ValidTypeName';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate ValidTypeName', () => {
  it('checks name starts with namespace', () => {
    expectReportsErrors(
      ValidateTypeName,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'User',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
            },
          ],
        }),
      ],
      [
        'Invalid type name: The type "User" has to start with the namespace "MyNamespace_"',
      ]
    );
  });

  it('checks max length', () => {
    expectReportsErrors(
      ValidateTypeName,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'MyNamespace_SomeRidiculouslyLongNameThatExceedsLength',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
            },
          ],
        }),
      ],
      [
        'Invalid type name: The name "MyNamespace_SomeRidiculouslyLongNameThatExceedsLength" exceeds the maximum length of 40 characters',
      ]
    );
  });

  it('checks min length', () => {
    expectReportsErrors(
      ValidateTypeName,
      [
        createTestModule({
          namespace: 'M',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'M_N',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
            },
          ],
        }),
      ],
      ['Invalid type name: The name "M_N" has to be at least 4 characters long']
    );
  });

  it('checks invalid format', () => {
    const invalidNames = [
      'MyNamespace_lowerCaseNotAllowed',
      'MyNamespace_0leadingNumber',
      'MyNamespace_With Space',
      'MyNamespace_TrailingSpace_',
    ];
    invalidNames.forEach((name) => {
      expectReportsErrors(
        ValidateTypeName,
        [
          createTestModule({
            namespace: 'MyNamespace',
            types: [
              {
                kind: TypeKind.OBJECT,
                name,
                description: 'A user of the project',
                fields: {
                  firstName: {
                    typeName: 'String',
                    required: false,
                  },
                },
              },
            ],
          }),
        ],
        [
          `Invalid type name: The type "${name}" has an invalid format. It has to start with an uppercase letter and can only contain alpha numeric characters`,
        ]
      );
    });
  });
});
