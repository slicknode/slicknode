/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ObjectTypeIndexValid from '../ObjectTypeIndexValid';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate ObjectTypeIndexValid', () => {
  it('fails for no fields defined', () => {
    expectReportsErrors(
      ObjectTypeIndexValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
              indexes: [{ fields: [] }],
            },
          ],
        }),
      ],
      ['Index on type "TestType" has to have at least 1 field']
    );
  });

  it('succeeds for single field', () => {
    expectReportsErrors(
      ObjectTypeIndexValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
              indexes: [{ fields: ['firstName'] }],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('succeeds for multiple fields', () => {
    expectReportsErrors(
      ObjectTypeIndexValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
                lastName: {
                  typeName: 'String',
                  required: false,
                },
              },
              indexes: [{ fields: ['firstName', 'lastName'] }],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('fails for unknown field', () => {
    expectReportsErrors(
      ObjectTypeIndexValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
              indexes: [{ fields: ['unknown'] }],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      ['Field "unknown" in index config on type "TestType" does not exist']
    );
  });

  it('fails for non unique fields', () => {
    expectReportsErrors(
      ObjectTypeIndexValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                firstName: {
                  typeName: 'String',
                  required: false,
                },
              },
              indexes: [{ fields: ['firstName', 'firstName'] }],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      ['Index fields on type "TestType" can only be added once']
    );
  });
});
