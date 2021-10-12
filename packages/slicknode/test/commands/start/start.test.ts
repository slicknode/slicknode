import { expect } from '../../test';
import { executeQuery, test, projectPath } from './helpers';

describe('start', () => {
  // @FIXME: Reenable tests once moduleResolution Node12 lands in TypeScript 4.5
  // Right now this fails bcs. mocha doesn't work with --experimental-modules, --es-module-specifier-resolution=node
  // and command imports ESM only modules
  return;

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .workspaceCommand(projectPath('empty'), [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
    ])
    .catch(/This directory does not have a valid slicknode.yml file/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .startCommand('initialized', [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
    ])
    .it('starts listening on default port', async (ctx) => {
      const result = await executeQuery({
        query: '{viewer{user{id}}}',
      });
      expect(result).to.deep.equal({
        data: {
          viewer: {
            user: null,
          },
        },
      });
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .startCommand('initialized', [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
      '--port',
      '3001',
    ])
    .it('starts listening on specified port', async (ctx) => {
      const result = await executeQuery({
        port: 3001,
        query: '{viewer{user{id}}}',
      });
      expect(result).to.deep.equal({
        data: {
          viewer: {
            user: null,
          },
        },
      });
      expect(ctx.stdout).to.include(
        'Server listening on: http://localhost:3001'
      );
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .startCommand('initialized', [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
    ])
    .it('logs message for unconfigured image handler', async (ctx) => {
      expect(ctx.stdout).to.include('Image handler not configured');
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .startCommand('initialized', [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
    ])
    .it('logs message for missing admin config', async (ctx) => {
      expect(ctx.stderr).to.include('Admin API configuration missing');
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .startCommand('custom-resolver', [
      'start',
      '--database-url',
      'postgresql://user:secret@localhost/dbname',
      '--settings',
      './my-settings.yml',
    ])
    .it('loads module settings', async (ctx) => {
      const result = await executeQuery({
        query: '{Blog_hello}',
      });
      expect(result).to.deep.equal({
        data: {
          Blog_hello: 'Hello John Doe',
        },
      });
    });
});
