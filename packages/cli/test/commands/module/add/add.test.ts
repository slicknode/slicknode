import path from 'path';
import { expect } from '@oclif/test';
import { mkdirpSync, readFileSync } from 'fs-extra';
import { test } from '../../../test';
import yaml from 'js-yaml';
import { LIST_MODULES_QUERY } from '../../../../src/commands/module/add';
import oneModuleResult from './one-module.json';
import twoModuleResult from './two-module.json';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('module:add', () => {
  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('empty'), ['module:add', 'blog'])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('shows error when dir is missing slicknode.yml', () => {});

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .api(
      {
        query: LIST_MODULES_QUERY,
        variables: { modules: ['image'] },
      },
      oneModuleResult
    )
    .workspaceCommand(projectPath('base'), ['module:add', 'image'])
    .it('adds single module successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Module "image" added - version: latest');
      const config = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      ) as any;
      expect(config.dependencies.image).to.equal('latest');
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .workspaceCommand(projectPath('base'), ['module:add', 'INVLIAD-'])
    .catch(/Invalid module name "INVLIAD-" provided/)
    .it('fails for invalid module name', (ctx) => {});

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .api(
      {
        query: LIST_MODULES_QUERY,
        variables: { modules: ['image', 'file'] },
      },
      twoModuleResult
    )
    .workspaceCommand(projectPath('base'), ['module:add', 'image', 'file'])
    .it('adds multiple modules successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Module "image" added - version: latest');
      expect(ctx.stdout).to.contain('Module "file" added - version: latest');
      const config = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      ) as any;
      expect(config.dependencies.image).to.equal('latest');
      expect(config.dependencies.file).to.equal('latest');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .api(
      {
        query: LIST_MODULES_QUERY,
        variables: { modules: ['image', 'file', 'nonexistent'] },
      },
      twoModuleResult
    )
    .workspaceCommand(projectPath('base'), [
      'module:add',
      'image',
      'file',
      'nonexistent',
    ])
    .catch(/Module "nonexistent" not found in registry/)
    .it('fails for non existent module', (ctx) => {});
});
