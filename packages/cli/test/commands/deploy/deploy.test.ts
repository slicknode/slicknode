import { expect, test } from '../../test';
import path from 'path';
import { MIGRATE_PROJECT_MUTATION } from '../../../src/commands/status';
import {
  CREATE_PROJECT_MUTATION,
  LIST_CLUSTER_QUERY,
} from '../../../src/commands/init';
import listClusterResult from './list-cluster.json';
import createProjectResult from './create-project.json';
import { GET_REPOSITORY_URL_QUERY } from '../../../src/utils/pullDependencies';
import * as nock from 'nock';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const MOCK_REGISTRY_URL = 'http://registry.localhost/';

describe('deploy', () => {
  test
    .login()
    .stdout()
    .stderr()
    .command(['deploy', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions(['Comparing local changes with cluster state'])
    .api(MIGRATE_PROJECT_MUTATION, {
      data: null,
      errors: [{ message: 'No access' }],
    })
    .command(['deploy', '--dir', projectPath('initialized')])
    .catch(/Error loading state from API: No access/)
    .it('fails for API load error', (ctx) => {});

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions(['Comparing local changes with cluster state'])
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [
            {
              type: 'UPDATE',
              breaking: true,
              path: ['types', 'User'],
              module: ['core'],
              description: 'Update permissions',
            },
          ],
        },
      },
    })
    .prompt([false])
    .command(['deploy', '--dir', projectPath('initialized')])
    .it('displays single change', (ctx) => {
      expect(ctx.stdout).to.contain('1 pending change');
      expect(ctx.stdout).to.contain('Update permissions');
      expect(ctx.stdout).to.contain('update:');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions(['Comparing local changes with cluster state'])
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [
            {
              type: 'UPDATE',
              breaking: true,
              path: ['types', 'User'],
              module: ['core'],
              description: 'Update permissions',
            },
            {
              type: 'REMOVE',
              breaking: true,
              path: ['types', 'User'],
              module: ['core'],
              description: 'Remove field removed',
            },
            {
              type: 'ADD',
              breaking: true,
              path: ['types', 'User'],
              module: ['core'],
              description: 'Add field test',
            },
          ],
        },
      },
    })
    .prompt([false])
    .command(['deploy', '--dir', projectPath('initialized')])
    .it('displays multiple changes', (ctx) => {
      expect(ctx.stdout).to.contain('3 pending change');
      expect(ctx.stdout).to.contain('Update permissions');
      expect(ctx.stdout).to.contain('Remove field removed');
      expect(ctx.stdout).to.contain('Add field test');
      expect(ctx.stdout).to.contain('update:');
      expect(ctx.stdout).to.contain('remove:');
      expect(ctx.stdout).to.contain('add:');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Comparing local changes with cluster state',
      'Deploying changes',
      'Updating local source files',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          node: {
            version: {
              bundle: 'http://localhost/dummybundle.zip',
            },
          },
        },
      },
    })
    .prompt([true])
    .command(['deploy', '--dir', projectPath('initialized')])
    .catch(/Error loading project config from servers/)
    .it(
      'fails when project bundle could not be loaded from server',
      (ctx) => {}
    );

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Comparing local changes with cluster state',
      'Deploying changes',
      'Updating local source files',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          node: {
            version: {
              bundle: 'http://localhost/dummybundle.zip',
            },
          },
        },
      },
    })
    .nock('http://localhost', (loader) =>
      loader
        .get('/dummybundle.zip')
        .replyWithFile(
          200,
          path.join(__dirname, 'testprojects', 'testbundle.zip')
        )
    )
    .prompt([true])
    .workspaceCommand(projectPath('with-module'), ['deploy'])
    .it('migrates project successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment successful');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Load available clusters',
      'Create project in cluster',
      'Waiting for API to launch',
      'Comparing local changes with cluster state',
      'Deploying changes',
      'Updating local source files',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          node: {
            version: {
              bundle: 'http://localhost/dummybundle.zip',
            },
          },
        },
      },
    })
    .api(LIST_CLUSTER_QUERY, listClusterResult)
    .nock('http://localhost', (loader) =>
      loader
        .get('/dummybundle.zip')
        .replyWithFile(
          200,
          path.join(__dirname, 'testprojects', 'testbundle.zip')
        )
    )
    .nock('http://testproject', (api) =>
      api.post('/').reply(200, { data: { __typename: 'Query' } })
    )
    .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([true, true, true])
    .workspaceCommand(projectPath('with-module'), [
      'deploy',
      '--env',
      'staging',
    ])
    .it('creates new project for unknown env', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment successful');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Updating dependencies',
      'Comparing local changes with cluster state',
      'Deploying changes',
      'Updating local source files',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          node: {
            version: {
              bundle: 'http://localhost/dummybundle.zip',
            },
          },
        },
      },
    })
    .api(GET_REPOSITORY_URL_QUERY, {
      data: {
        registryUrl: MOCK_REGISTRY_URL,
      },
    })
    // Mock registry requests for modules
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('auth'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('auth'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('core'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('core'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('image'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('image'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('relay'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('relay'))
    // .api(LIST_CLUSTER_QUERY, listClusterResult)
    .nock('http://localhost', (loader) =>
      loader
        .get('/dummybundle.zip')
        .replyWithFile(
          200,
          path.join(__dirname, 'testprojects', 'testbundle.zip')
        )
    )
    // .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([true])
    .workspaceCommand(projectPath('missing-dependencies'), ['deploy'])
    .it('pulls missing dependencies on deployment', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment successful');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Updating dependencies',
      'Comparing local changes with cluster state',
      'Deploying changes',
      'Updating local source files',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          node: {
            version: {
              bundle: 'http://localhost/dummybundle.zip',
            },
          },
        },
      },
    })
    .api(GET_REPOSITORY_URL_QUERY, {
      data: {
        registryUrl: MOCK_REGISTRY_URL,
      },
    })
    // Mock registry requests for modules
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('auth'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('auth'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('core'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('core'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('image'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('image'))
    .nock(MOCK_REGISTRY_URL, mockRegistryModule('relay'))
    .nock(MOCK_REGISTRY_URL, mockRegistryArchive('relay'))
    // .api(LIST_CLUSTER_QUERY, listClusterResult)
    .nock('http://localhost', (loader) =>
      loader
        .get('/dummybundle.zip')
        .replyWithFile(
          200,
          path.join(__dirname, 'testprojects', 'testbundle.zip')
        )
    )
    // .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([true])
    .workspaceCommand(projectPath('single-missing-dependency'), ['deploy'])
    .it(
      'pulls missing dependencies on deployment for single missing dependency',
      (ctx) => {
        expect(ctx.stdout).to.contain('Deployment successful');
      }
    );

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Load available clusters',
      'Create project in cluster',
      'Waiting for API to launch',
      'Comparing local changes with cluster state',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    .nock('http://testproject', (api) =>
      api.post('/').reply(200, { data: { __typename: 'Query' } })
    )
    .api(LIST_CLUSTER_QUERY, listClusterResult)
    .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([true, true, false])
    .workspaceCommand(projectPath('with-module'), [
      'deploy',
      '--env',
      'staging',
    ])
    .it('aborts project deployment for new env on user input', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment aborted');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr()
    .cliActions([
      'Load available clusters',
      'Create project in cluster',
      'Waiting for API to launch',
      'Comparing local changes with cluster state',
    ])
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {
      data: {
        migrateProject: {
          changes: [],
        },
      },
    })
    .nock('http://testproject', (api) =>
      api.post('/').reply(403, { data: { __typename: 'Query' } })
    )
    .timeout(62000) // Testing wait for API timeout
    .api(LIST_CLUSTER_QUERY, listClusterResult)
    .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([true, true, false])
    .workspaceCommand(projectPath('with-module'), [
      'deploy',
      '--env',
      'staging',
    ])
    .it('displays warning message for unavailable API', (ctx) => {
      expect(ctx.stderr).to.contain(
        'The project was created but the API is not reachable'
      );
      expect(ctx.stdout).to.contain('Deployment aborted');
    });
});

function mockRegistryModule(name: string) {
  return (api: nock.Scope) => {
    const archivePath = `archive/${name}.zip`;
    api.get(`/${name}`).reply(200, {
      id: 'image',
      tags: {
        latest: '0.0.1',
      },
      versions: {
        '0.0.1': {
          dist: {
            zip: `${MOCK_REGISTRY_URL}${archivePath}`,
          },
        },
      },
    });
  };
}

function mockRegistryArchive(name: string) {
  return (api: nock.Scope) => {
    const archivePath = `/archive/${name}.zip`;
    api
      .get(archivePath)
      .replyWithFile(
        200,
        path.join(__dirname, 'module-archives', `${name}.zip`)
      );
  };
}
