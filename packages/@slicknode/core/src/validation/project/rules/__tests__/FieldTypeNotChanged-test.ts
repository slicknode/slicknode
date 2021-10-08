/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import FieldTypeNotChanged from '../FieldTypeNotChanged';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate FieldTypeNotChanged', () => {
  it('passes for new fields', () => {
    expectReportsErrors(
      FieldTypeNotChanged,
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
              },
            },
          ],
        }),
      ],
      [],
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
      ]
    );
  });

  it('fails for changed field type', () => {
    expectReportsErrors(
      FieldTypeNotChanged,
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
              },
            },
          ],
        }),
      ],
      [
        'Changing the type for field "fieldString" on type "TestType" from "Int" to "String" not supported. Delete field, run migration and add the new type afterwards instead (WARNING: data will be lost).',
      ],
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'Int', required: false },
              },
            },
          ],
        }),
      ]
    );
  });

  it('fails for list to no list', () => {
    expectReportsErrors(
      FieldTypeNotChanged,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'String', list: true },
              },
            },
          ],
        }),
      ],
      [
        'Changing the type for field "fieldString" on type "TestType" from "String" to "String" not supported. Delete field, run migration and add the new type afterwards instead (WARNING: data will be lost)',
      ],
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'String', list: false },
              },
            },
          ],
        }),
      ]
    );
  });

  it('fails for no list to list', () => {
    expectReportsErrors(
      FieldTypeNotChanged,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'String', list: false },
              },
            },
          ],
        }),
      ],
      [
        'Changing the type for field "fieldString" on type "TestType" from "String" to "String" not supported. Delete field, run migration and add the new type afterwards instead (WARNING: data will be lost)',
      ],
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                fieldString: { typeName: 'String', list: true },
              },
            },
          ],
        }),
      ]
    );
  });

  it('fails for no list to list on related field', () => {
    expectReportsErrors(
      FieldTypeNotChanged,
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID' },
              },
            },
          ],
          typeExtensions: {
            TestType: {
              fieldString: { typeName: 'String' },
            },
          },
        }),
      ],
      [
        'Changing the type for field "fieldString" on type "TestType" from "String" to "String" not supported. Delete field, run migration and add the new type afterwards instead (WARNING: data will be lost)',
      ],
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                id: { typeName: 'ID' },
              },
            },
          ],
          typeExtensions: {
            TestType: {
              fieldString: { typeName: 'String', list: true },
            },
          },
        }),
      ]
    );
  });
});
