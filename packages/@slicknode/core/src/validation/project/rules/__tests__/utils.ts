/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */
import { ValidationRule } from '../../validate';
import { validateUsingRules } from '../../validate';
import { ModuleConfig } from '../../../../definition';
import { ModuleKind } from '../../../../definition';
import { expect } from 'chai';

export function expectReportsErrors(
  rule: ValidationRule,
  modules: Array<ModuleConfig>,
  errors: Array<string>,
  currentModules: Array<ModuleConfig> = []
): void {
  const context = validateUsingRules(modules, currentModules, [rule]);

  const actualErrors = context.getErrors();

  // Check if actual messages are expected
  const actualMessages = actualErrors.map((e) => e.message);
  actualMessages.forEach((message) => {
    const matchingErrors = errors.filter((errMessage) =>
      message.includes(errMessage)
    );

    expect(matchingErrors.length).to.be.above(
      0,
      `Reports unexpected error: ${message}`
    );
  });

  // Check if all expected error messages are returned
  errors.forEach((message) => {
    const matchingErrors = actualMessages.filter((actualMessage) =>
      actualMessage.includes(message)
    );

    expect(matchingErrors.length).to.be.above(
      0,
      `Missing error report: ${message}`
    );
  });

  expect(actualMessages.length).to.equal(errors.length);
}

/**
 * Creates a test ModuleConfig merging the provided properties into the config
 * @param conf
 * @returns {{}}
 */
export function createTestModule(conf: Partial<ModuleConfig>): ModuleConfig {
  return {
    id: '@private/test-app',
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    admin: {
      base: {
        name: 'Testapp',
        description: 'test app',
        pages: [],
        types: {},
        mutations: {},
      },
    },
    ...conf,
  };
}
