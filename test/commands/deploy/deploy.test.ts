import {expect, test} from '../../test';
import path from 'path';
import {MIGRATE_PROJECT_MUTATION} from '../../../src/commands/status';
import {CREATE_PROJECT_MUTATION, LIST_CLUSTER_QUERY} from '../../../src/commands/init';
import listClusterResult from './list-cluster.json';
import createProjectResult from './create-project.json';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('deploy', () => {
  test
    .login()
    .stdout()
    .stderr()
    .command(['deploy', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('fails for folder without slicknode.yml', ctx => {

    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    .api(MIGRATE_PROJECT_MUTATION, {data: null, errors: [{message: 'No access'}]})
    .command(['deploy', '--dir', projectPath('initialized')])
    .catch(/Error loading state from API: No access/)
    .it('fails for API load error', ctx => {

    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        changes: [
          {
            type: 'UPDATE',
            breaking: true,
            path: ['types', 'User'],
            module: ['core'],
            description: 'Update permissions',
          }
        ]
      }
    }})
    .prompt([ false ])
    .command(['deploy', '--dir', projectPath('initialized')])
    .it('displays single change', ctx => {
      expect(ctx.stdout).to.contain('1 pending change');
      expect(ctx.stdout).to.contain('Update permissions');
      expect(ctx.stdout).to.contain('update:');
    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    .api(MIGRATE_PROJECT_MUTATION, {data: {
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
          }
        ]
      }
    }})
    .prompt([ false ])
    .command(['deploy', '--dir', projectPath('initialized')])
    .it('displays multiple changes', ctx => {
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
    .stdout({stripColor: true})
    .stderr()
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        changes: []
      }
    }})
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        node: {
          version: {
            bundle: 'http://localhost/dummybundle.zip'
          }
        }
      }
    }})
    .prompt([ true ])
    .command(['deploy', '--dir', projectPath('initialized')])
    .catch(/Error loading project config from servers/)
    .it('fails when project bundle could not be loaded from server', ctx => {

    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        changes: []
      }
    }})
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        node: {
          version: {
            bundle: 'http://localhost/dummybundle.zip'
          }
        }
      }
    }})
    .nock(
      'http://localhost',
       loader => loader.get('/dummybundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .prompt([ true ])
    .workspaceCommand(projectPath('with-module'), ['deploy'])
    .it('migrates project successfully', ctx => {
      expect(ctx.stdout).to.contain('Deployment successful');
    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        changes: []
      }
    }})
    // Actual migration
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        node: {
          version: {
            bundle: 'http://localhost/dummybundle.zip'
          }
        }
      }
    }})
    .api(LIST_CLUSTER_QUERY, listClusterResult)
    .nock(
      'http://localhost',
       loader => loader.get('/dummybundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([ true, true, true ])
    .workspaceCommand(projectPath('with-module'), ['deploy', '--env', 'staging'])
    .it('creates new project for unknown env', ctx => {
      expect(ctx.stdout).to.contain('Deployment successful');
    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr()
    // Dry run request
    .api(MIGRATE_PROJECT_MUTATION, {data: {
      migrateProject: {
        changes: []
      }
    }})
    .api(LIST_CLUSTER_QUERY, listClusterResult)
    .api(CREATE_PROJECT_MUTATION, createProjectResult)
    .prompt([ true, true, false ])
    .workspaceCommand(projectPath('with-module'), ['deploy', '--env', 'staging'])
    .it('aborts project deployment for new env on user input', ctx => {
      expect(ctx.stdout).to.contain('Deployment aborted');
    });
});
