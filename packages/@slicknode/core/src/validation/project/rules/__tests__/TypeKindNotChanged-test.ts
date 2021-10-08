/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import TypeKindNotChanged from '../TypeKindNotChanged';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate TypeKindNotChanged', () => {
  it('passes for new fields', () => {
    expectReportsErrors(
      TypeKindNotChanged,
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

  it('fails for changed type kind', () => {
    expectReportsErrors(
      TypeKindNotChanged,
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
        'Cannot change the kind of type "TestType". Delete the type, run migration and add the new type instead.',
      ],
      [
        createTestModule({
          namespace: 'NS',
          types: [
            {
              kind: TypeKind.INTERFACE,
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
});
