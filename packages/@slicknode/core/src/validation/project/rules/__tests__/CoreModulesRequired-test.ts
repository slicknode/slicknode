/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import CoreModulesRequired from '../CoreModulesRequired';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';
import { baseModules } from '../../../../modules';

describe('Validate CoreModulesRequired', () => {
  it('fails for changed type kind', () => {
    expectReportsErrors(
      CoreModulesRequired,
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
        'The modules "core", "auth", "relay" are required. Add them to your root slicknode.yml',
      ]
    );
  });

  it('passes for included base modules', () => {
    expectReportsErrors(CoreModulesRequired, baseModules, []);
  });
});
