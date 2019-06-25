import {expect, test} from '../../test';
import {LIST_CLUSTER_QUERY, CREATE_PROJECT_MUTATION} from '../../../src/commands/init';
import path from 'path';

const clusterResult = {
  data: {
    listCluster: {
      edges: [
        {
          node: {
            id: 'Q2x1c3Rlcjox',
            alias: 'gcp.us-east1',
            name: 'Google US East 1 (South Carolina)',
            pingUrl: 'http://ping.us-east1.slicknode.com/'
          }
        }
      ]
    }
  }
};

describe('init', () => {
  test
    .login()
    .api(LIST_CLUSTER_QUERY, {data: null, errors: [{message: 'Error'}]})
    .stdout()
    .command(['init'])
    .catch('Could not load available clusters. Make sure you have a working internet connection and try again.')
    .it('shows error when cluster could not be loaded', ctx => {
      expect(ctx.stdout).to.contain('Load available clusters');
    });

  test
    .stdout()
    .login()
    .command(['init', '--dir', path.join(__dirname, 'testprojects', 'initialized')])
    .catch('The directory is already initialized as a slicknode project')
    .it('checks if project is already initialized', ctx => {

    });

  test
    .stdout()
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: null, errors: [{message: 'Error'}]})
    .command(['init', '--dir', path.join(__dirname, 'testprojects', 'empty')])
    .catch('Initialization failed: ERROR: Could not create project. Please try again later.')
    .it('shows error for failed project creation', ctx => {
      expect(ctx.stdout).to.contain('Creating project');
    });
});
