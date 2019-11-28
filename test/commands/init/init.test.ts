import {expect, test} from '../../test';
import {LIST_CLUSTER_QUERY, CREATE_PROJECT_MUTATION} from '../../../src/commands/init';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import {Kind, parse} from 'graphql';

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
  const EMPTY_DIR = path.join(__dirname, 'testprojects', 'empty');

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, {data: null, errors: [{message: 'Error'}]})
    .command(['init'])
    .catch('Could not load available clusters. Make sure you have a working internet connection and try again.')
    .it('shows error when cluster could not be loaded', ctx => {
      // expect(ctx.stderr).to.contain('done');
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
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: null, errors: [{message: 'Error'}]})
    .command(['init', '--dir', EMPTY_DIR])
    .catch('Initialization failed: ERROR: Could not create project. Please try again later.\nError')
    .it('shows error for failed project creation', ctx => {
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
        }
      }
    }})
    .command(['init', '--dir', EMPTY_DIR])
    .catch(/Initialization failed: Project was created but could not be fully initialized/)
    .it('fails for successful creation but incomplete setup', ctx => {
      // expect(ctx.stdout).to.contain('Creating project');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .command(['init', '--dir', EMPTY_DIR])
    .catch(/Initialization failed/)
    .it('fails when bundle cannot be loaded', ctx => {
      // expect(ctx.stdout).to.contain('Creating project');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .workspaceCommand(EMPTY_DIR, ['init'])
    .it('initializes project successfully', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          '@private/test-app': './modules/test-app',
          auth: 'latest',
          core: 'latest',
          image: 'latest',
          relay: 'latest',
        }
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs.readFileSync(
          path.join(ctx.workspace!, '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir'])
    .it('initializes project successfully and creates directory', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml')).toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          '@private/test-app': './modules/test-app',
          auth: 'latest',
          core: 'latest',
          image: 'latest',
          relay: 'latest',
        }
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');
    });
});
