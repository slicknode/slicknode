import {expect, test} from '../../test';
import path from 'path';
import execute from '../../../src/utils/execute';
import sinon from 'sinon';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('runtime:build', () => {

  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .tmpdir()
    .prompt([ true ])
    .workspaceCommand(projectPath('empty'), ctx => ['runtime:build', ctx.tmpdir])
    .catch(/Error loading module configs/)
    .it('fails for folder without slicknode.yml', ctx => {

    });

  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .tmpdir()
    .prompt([ true ])
    .timeout(20000)
    .workspaceCommand(projectPath('initialized'), ctx => ['runtime:build', ctx.tmpdir])
    .do(async (ctx) => {
      await execute('npm', [ 'install' ], null, {
        cwd: ctx.tmpdir,
      });
    })
    .it('creates build successfully', async ctx => {
      const runtime = require(ctx.tmpdir!);
      const req = {
        body: '{}',
        headers: {}
      };
      const res = {
        json: sinon.stub(),
      };
      await runtime.function(req, res);
      expect(res.json.called).to.equal(true);
      expect(ctx.stdout).to.contain('Build complete');
    });
});
