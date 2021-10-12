import { expect, test } from '../../test';
import * as path from 'path';
import execute from '../../../src/utils/execute';
import * as sinon from 'sinon';
import { importDynamic } from '../../../src/utils/importDynamic';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const npmCommand = /^win/.test(process.platform) ? 'npm.cmd' : 'npm';

describe('runtime:build', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .prompt([true])
    .workspaceCommand(projectPath('empty'), (ctx) => [
      'runtime:build',
      ctx.tmpdir,
    ])
    .catch(/Error loading module configs/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  // @FIXME: Reenable tests once moduleResolution Node12 lands in TypeScript 4.5
  // Right now this fails bcs. mocha doesn't work with --experimental-modules, --es-module-specifier-resolution=node
  // and command imports ESM only modules
  return;

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .tmpdir()
    .prompt([true])
    .timeout(20000)
    .workspaceCommand(projectPath('initialized'), (ctx) => [
      'runtime:build',
      ctx.tmpdir,
    ])
    .do(async (ctx) => {
      await execute(npmCommand, ['install'], null, {
        cwd: ctx.tmpdir,
      });
    })
    .it('creates build successfully', async (ctx) => {
      const runtime = await importDynamic(ctx.tmpdir!);
      const req = {
        body: '{}',
        headers: {},
      };
      const res = {
        json: sinon.stub(),
      };
      await runtime.function(req, res);
      expect(res.json.called).to.equal(true);
      expect(ctx.stdout).to.contain('Build complete');
    });
});
