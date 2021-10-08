import _ from 'lodash';
import chalk from 'chalk';
import { IProjectChange, IProjectChangeError } from '../types';

export function printChanges(
  changes: IProjectChange[],
  logger: (message: string) => void
) {
  if (changes.length) {
    const sortedChanges = _.sortBy(
      changes,
      (change) => change.type + ':' + (change.path || []).join('.')
    );

    logger(
      `${changes.length} pending change${changes.length === 1 ? '' : 's'}:`
    );
    sortedChanges.forEach((change, index) => {
      switch (change.type) {
        case 'ADD': {
          logger('  ' + chalk.green(`add:    ${change.description}`));
          break;
        }
        case 'REMOVE': {
          logger('  ' + chalk.red(`remove:  ${change.description}`));
          break;
        }
        case 'UPDATE': {
          logger('  ' + chalk.yellow(`update:  ${change.description}`));
          break;
        }
        default: {
          logger('  ' + `${index + 1}. ${change.description}`);
          break;
        }
      }
    });
  } else {
    logger('No changes detected in project.');
  }
}

export function printErrors(
  errors: IProjectChangeError[],
  logger: (message: string) => void
) {
  if (errors.length) {
    logger(
      chalk.red(
        `\nThe project has ${errors.length} error${
          errors.length === 1 ? '' : 's'
        }:`
      )
    );
    errors.forEach((error, index) => {
      logger('  ' + chalk.red(`${index + 1}. ${error.description}`));
    });
    logger('');
  }
}
