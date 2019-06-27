import path from 'path';
import {expect} from '@oclif/test';
import os from 'os';
import uuid from 'uuid';
import copyfiles from 'copyfiles';
import {mkdirpSync, readFileSync} from 'fs-extra';
import {test} from '../../../test';
import yaml from 'js-yaml';

describe('init', () => {
  const tmpWorkspace = path.join(os.tmpdir(), uuid.v1());

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test1');
        const sourceDir = path.join(__dirname, 'testprojects', 'empty');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .command(['module:create', 'blog', '--dir', path.join(tmpWorkspace, 'test1')])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('shows error when dir is missing slicknode.yml', () => {
    });

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test2');
        const sourceDir = path.join(__dirname, 'testprojects', 'empty');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .command(['module:create', 'INVALIDMODULE', '--dir', path.join(tmpWorkspace, 'test2')])
    .catch(/The module name is invalid, it can only contain letters, numbers and hyphens/)
    .it('fails for invalid module name', () => {
    });

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test3');
        const sourceDir = path.join(__dirname, 'testprojects', 'base');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .prompt(['invalidnamespace'])
    .command(['module:create', 'blog', '--dir', path.join(tmpWorkspace, 'test3')])
    .catch(/Please enter a valid namespace/)
    .it('throws error for invalid namespace', () => {
    });

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test4');
        const sourceDir = path.join(__dirname, 'testprojects', 'base');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .prompt(['MyNamespace', ''])
    .command(['module:create', 'blog', '--dir', path.join(tmpWorkspace, 'test4')])
    .catch(/Please enter a valid label for the module/)
    .it('throws error for empty label', () => {
    });

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test5');
        const sourceDir = path.join(__dirname, 'testprojects', 'base');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .prompt(['MyNamespace', 'test'.repeat(1000)])
    .command(['module:create', 'blog', '--dir', path.join(tmpWorkspace, 'test5')])
    .catch(/Please enter a valid label for the module/)
    .it('throws error for too long label', () => {
    });

  test
    .stdout()
    .stderr()
    .do(async () => {
      return await new Promise((resolve) => {
        const testDir = path.join(tmpWorkspace, 'test6');
        const sourceDir = path.join(__dirname, 'testprojects', 'base');
        mkdirpSync(testDir);
        copyfiles([
          path.join(sourceDir, '*'),
          testDir,
        ], {up: sourceDir.split('/').length}, resolve);
      });
    })
    .prompt(['MyNamespace', 'Testlabel'])
    .command(['module:create', 'blog', '--dir', path.join(tmpWorkspace, 'test6')])
    .it('creates module successfully', (ctx: {stdout: string}) => {
      const projectDir = path.join(tmpWorkspace, 'test6');
      const projectConfig = yaml.safeLoad(readFileSync(path.join(projectDir, 'slicknode.yml')).toString());
      expect(projectConfig).to.deep.equal({
        dependencies: {
          '@private/blog': './modules/blog',
          auth: 'latest',
          core: 'latest',
          relay: 'latest'
        }
      });
      expect(ctx.stdout).to.contain('SUCCESS! Module was created');
      expect(ctx.stdout).to.contain('Add your type definitions to ./modules/blog/schema.graphql');

      const moduleConfig = yaml.safeLoad(
        readFileSync(path.join(projectDir, 'modules', 'blog', 'slicknode.yml')).toString()
      );
      console.log(moduleConfig);
      expect(moduleConfig).to.deep.equal({
        module:{
          id: '@private/blog',
          label: 'Testlabel',
          namespace: 'MyNamespace'
        }
      });
    });
});
