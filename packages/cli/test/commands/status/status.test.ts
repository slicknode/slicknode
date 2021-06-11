import { expect, test } from '../../test';
import path from 'path';
import { MIGRATE_PROJECT_MUTATION } from '../../../src/commands/status';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('status', () => {
  test
    .login()
    .stdout()
    .stderr()
    .command(['status', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .login()
    .cliActions(['Comparing local changes with cluster state'])
    .stdout({ stripColor: true })
    .stderr()
    .api(MIGRATE_PROJECT_MUTATION, {
      data: null,
      errors: [{ message: 'No access' }],
    })
    .command(['status', '--dir', projectPath('initialized')])
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
    .command(['status', '--dir', projectPath('initialized')])
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
    .command(['status', '--dir', projectPath('initialized')])
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
    .stderr({ stripColor: true })
    .command(['status', '--dir', projectPath('with-syntax-error')])
    .catch(/Abort/)
    .it('fails for syntax error in GraphQL schema', (ctx) => {
      expect(ctx.stderr).to.contain('Error parsing schema');
      expect(ctx.stderr).to.contain('Unexpected Name');
      expect(ctx.stderr).to.contain('"some"');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .command([
      'status',
      '--dir',
      projectPath('with-invalid-module-slicknode-yml'),
    ])
    .catch(/Abort/)
    .it('fails for invalid module slicknode.yml', (ctx) => {
      expect(ctx.stderr).to.contain(
        'Invalid value at path "module,invalidAttribute"'
      );
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
    .command(['status', '--dir', projectPath('with-remote-module')])
    .it('displays multiple changes for remote module', (ctx) => {
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
    .stderr({})
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
    .command([
      'status',
      '--dir',
      projectPath('with-remote-module-custom-root-types'),
    ])
    .it('can merge remote schemas with custom root types', (ctx) => {
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
    .stderr({ stripColor: true })
    .command([
      'status',
      '--dir',
      projectPath('with-remote-module-duplicate-types'),
    ])
    .catch(/Abort/)
    .it('validates remote GraphQL schema', (ctx) => {
      expect(ctx.stderr).to.contain('There can be only one');
      expect(ctx.stderr).to.contain('type named "Viewer"');
    });
});
