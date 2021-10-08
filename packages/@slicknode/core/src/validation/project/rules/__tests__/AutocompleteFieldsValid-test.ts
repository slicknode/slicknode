/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import AutocompleteFieldsValid from '../AutocompleteFieldsValid';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate AutocompleteFieldsValid', () => {
  it('fails for no fields defined', () => {
    expectReportsErrors(
      AutocompleteFieldsValid,
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
              autoCompleteFields: [],
            },
          ],
        }),
      ],
      ['Autocomplete on type "TestType" has to have at least 1 field']
    );
  });

  it('fails for non String fields', () => {
    expectReportsErrors(
      AutocompleteFieldsValid,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'A user of the project',
              fields: {
                int: {
                  typeName: 'Int',
                  required: false,
                },
                float: {
                  typeName: 'Float',
                  required: false,
                },
              },
              autoCompleteFields: ['int', 'float'],
            },
          ],
        }),
      ],
      [
        'Invalid autocomplete field "int" on type "TestType". Field has to be of type "String", found type "Int".',
        'Invalid autocomplete field "float" on type "TestType". Field has to be of type "String", found type "Float".',
      ]
    );
  });

  it('succeeds for single field', () => {
    expectReportsErrors(
      AutocompleteFieldsValid,
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
              autoCompleteFields: ['firstName'],
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
      AutocompleteFieldsValid,
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
              autoCompleteFields: ['firstName', 'lastName'],
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
      AutocompleteFieldsValid,
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
              autoCompleteFields: ['unknown'],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      ['Autocomplete field "unknown" on type "TestType" does not exist']
    );
  });

  it('fails for non unique fields', () => {
    expectReportsErrors(
      AutocompleteFieldsValid,
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
              autoCompleteFields: ['firstName', 'firstName'],
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      ['Autocomplete fields on type "TestType" can only be added once']
    );
  });
});
