import { expect, test } from '../../test';
import * as path from 'path';
import { ExpressImport } from '../../../src/commands/runtime/start';
import request from 'supertest';
import { RuntimeContext } from 'slicknode-runtime';
import fs from 'fs';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const DUMMY_CONTEXT: RuntimeContext = {
  api: {
    endpoint: 'http://localhost',
    accessToken: 'xyz123',
  },
  request: {
    ip: '127.0.0.1',
    id: '1234xyz',
  },
  project: {
    alias: 'test-project',
  },
  settings: {},
};

describe('runtime:start', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .workspaceCommand(projectPath('empty'), (ctx) => ['runtime:start'])
    .catch(/Error loading module configs/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .timeout(20000)
    .tmpExpress(ExpressImport)
    .workspaceCommand(projectPath('initialized'), (ctx) => ['runtime:start'])
    .it('shows warning for start without secret', async (ctx) => {
      const response = await request(ctx.expressApp)
        .post('/')
        .send({ sef: 'sef' })
        .expect(200);

      expect(ctx.stderr).to.include(
        'No secret set in runtime. Authorization is skipped and server is insecure.'
      );
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .timeout(20000)
    .tmpExpress(ExpressImport)
    .workspaceCommand(projectPath('initialized'), (ctx) => [
      'runtime:start',
      '--secret',
      'somesecretkey1234',
    ])
    .it('shows error for missing authorization header', async (ctx) => {
      const response = await request(ctx.expressApp)
        .post('/')
        .send({ sef: 'sef' })
        .expect(200);

      expect(ctx.stderr).to.not.include(
        'No secret set in runtime. Authorization is skipped and server is insecure.'
      );
      expect(response.body).to.deep.equal({
        data: null,
        error: {
          message: 'Authorization failed: No authorization header found',
        },
      });
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .timeout(20000)
    .tmpExpress(ExpressImport)
    .workspaceCommand(projectPath('with-code'), (ctx) => ['runtime:start'])
    .it(
      'executes code from JS file in module, ignoring file changes',
      async (ctx) => {
        const response = await request(ctx.expressApp)
          .post('/')
          .send({
            module: '@private/blog',
            handler: 'helloWorld',
            payload: { test: 34 },
            context: DUMMY_CONTEXT,
          })
          .expect(200);

        expect(response.body).to.deep.equal({
          data: 123,
        });

        // Update content in handler
        fs.writeFileSync(
          path.join(ctx.workspace!, 'modules', 'blog', 'helloWorld.js'),
          'module.exports = () => 234'
        );

        // Still returns old data
        const response2 = await request(ctx.expressApp)
          .post('/')
          .send({
            module: '@private/blog',
            handler: 'helloWorld',
            payload: { test: 34 },
            context: DUMMY_CONTEXT,
          })
          .expect(200);

        expect(response2.body).to.deep.equal({
          data: 123,
        });
      }
    );

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .timeout(20000)
    .tmpExpress(ExpressImport)
    .workspaceCommand(projectPath('with-code'), (ctx) => [
      'runtime:start',
      '--watch',
    ])
    .it('updates code in watch mode', async (ctx) => {
      const response = await request(ctx.expressApp)
        .post('/')
        .send({
          module: '@private/blog',
          handler: 'helloWorld',
          payload: { test: 34 },
          context: DUMMY_CONTEXT,
        })
        .expect(200);

      expect(response.body).to.deep.equal({
        data: 123,
      });

      // Update content in handler
      fs.writeFileSync(
        path.join(ctx.workspace!, 'modules', 'blog', 'helloWorld.js'),
        'module.exports = () => 234'
      );

      // Returns updated data
      const response2 = await request(ctx.expressApp)
        .post('/')
        .send({
          module: '@private/blog',
          handler: 'helloWorld',
          payload: { test: 34 },
          context: DUMMY_CONTEXT,
        })
        .expect(200);

      expect(response2.body).to.deep.equal({
        data: 234,
      });
    });
});
