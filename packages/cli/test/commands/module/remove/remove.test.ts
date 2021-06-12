import * as path from 'path';
import { expect } from '@oclif/test';
import { readFileSync, pathExistsSync } from 'fs-extra';
import { test } from '../../../test';
import yaml from 'js-yaml';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('module:remove', () => {
  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('empty'), ['module:remove', 'blog'])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('shows error when dir is missing slicknode.yml', () => {});

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), ['module:remove', 'INVALIDMODULE'])
    .catch(/Module "INVALIDMODULE" not found in the project/)
    .it('fails for invalid module name', () => {});

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), ['module:remove', 'nonexistent'])
    .catch(/Module "nonexistent" not found in the project/)
    .it('fails for non-existent module name', () => {});

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), ['module:remove', 'image'])
    .it('removes core module successfully', (ctx) => {
      const projectConfig = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(projectConfig).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });
    });

  test
    .stdout()
    .stderr()
    .prompt([true])
    .workspaceCommand(projectPath('with-module'), [
      'module:remove',
      '@private/test-app',
    ])
    .it('removes private module and files successfully', (ctx) => {
      const projectConfig = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(projectConfig).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });

      expect(
        pathExistsSync(path.join(ctx.workspace!, 'modules/test-app'))
      ).to.equal(false);
    });

  test
    .stdout()
    .stderr()
    .prompt([false])
    .workspaceCommand(projectPath('with-module'), [
      'module:remove',
      '@private/test-app',
    ])
    .it('removes private module but keeps files', (ctx) => {
      const projectConfig = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(projectConfig).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });

      expect(
        pathExistsSync(
          path.join(ctx.workspace!, 'modules/test-app/slicknode.yml')
        )
      ).to.equal(true);
    });
});
