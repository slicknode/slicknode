/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
/* eslint-disable max-len */
import NoModuleRuntime from '../NoModuleRuntime';
import { expectReportsErrors, createTestModule } from './utils';
import { TypeKind } from '../../../../definition';
import { baseModules } from '../../../../modules';

describe('Validate NoModuleRuntime', () => {
  it('fails for modules with runtime configuration', () => {
    expectReportsErrors(
      NoModuleRuntime,
      [
        ...baseModules,
        createTestModule({
          namespace: 'NS',
          runtime: {
            config: {
              engine: 'nodejs@8',
              memory: 512,
            },
          },
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
        'No runtime endpoint is configured for the project. Set the runtime endpoint for the project or remove the runtime from the module "@private/test-app".',
      ]
    );
  });

  it('passes for modules without runtime', () => {
    expectReportsErrors(NoModuleRuntime, baseModules, []);
  });
});
