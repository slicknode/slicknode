/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import ObjectTypeRequiresNode from '../ObjectTypeRequiresNode';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';

describe('Validate ObjectTypeRequiresNode', () => {
  it('fails for object type without node', () => {
    expectReportsErrors(
      ObjectTypeRequiresNode,
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
            },
          ],
        }),
      ],
      ['Type "TestType" has to implement "Node" interface']
    );
  });

  it('succeeds for object type with node', () => {
    expectReportsErrors(
      ObjectTypeRequiresNode,
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
              interfaces: ['Node'],
            },
          ],
        }),
      ],
      []
    );
  });

  it('succeeds for interface type', () => {
    expectReportsErrors(
      ObjectTypeRequiresNode,
      [
        createTestModule({
          namespace: 'MyNamespace',
          types: [
            {
              kind: TypeKind.INTERFACE,
              name: 'TestType',
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
      []
    );
  });
});
