/**
 * Created by Ivo Meißner on 28.09.17.
 *
 */
import { validateUsingRules } from './validate';
import { ModuleConfig } from '../../definition';
import rules from './rules';
import { PackageError } from '../../errors';
import { ValidationRule } from './validate';

/**
 * Validates the modules of the project
 *
 * @param modules
 * @param currentModules
 * @param extraRules
 * @returns {Array.<GraphQLError>|Array.<PackageError>}
 */
export function validateProject(
  modules: Array<ModuleConfig>,
  currentModules: Array<ModuleConfig>,
  extraRules: Array<ValidationRule> = []
): Array<PackageError> {
  const context = validateUsingRules(modules, currentModules, [
    ...rules,
    ...extraRules,
  ]);
  return context.getErrors();
}

export default validateProject;
