import {expect, test} from '../../test';
import {LIST_CLUSTER_QUERY} from '../../../src/commands/init';

describe('init', () => {
  test
    .api(LIST_CLUSTER_QUERY, {data: null, errors: [{message: 'Error'}]})
    .stdout()
    .stderr()
    .command(['init'])
    .catch('Could not load available clusters. Make sure you have a working internet connection and try again.')
    .it('shows error when cluster could not be loaded', ctx => {
      expect(ctx.stdout).to.contain('Load available clusters');
    });
});
