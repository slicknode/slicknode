import path from 'path';
import {expect} from '@oclif/test';
import os from 'os';
import uuid from 'uuid';
import copyfiles from 'copyfiles';
import {mkdirpSync, readFileSync} from 'fs-extra';
import {test} from '../../../test';
import yaml from 'js-yaml';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('module:create', () => {
  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('empty'), ['module:create', 'blog'])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('shows error when dir is missing slicknode.yml', () => {
    });

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('empty'), ['module:create', 'INVALIDMODULE'])
    .catch(/The module name is invalid, it can only contain letters, numbers and hyphens/)
    .it('fails for invalid module name', () => {
    });

  test
    .stdout()
    .stderr()
    .prompt(['invalidnamespace'])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog'])
    .catch(/Please enter a valid namespace/)
    .it('throws error for invalid namespace', () => {
    });

  test
    .stdout()
    .stderr()
    .prompt(['MyNamespace', ''])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog'])
    .catch(/Please enter a valid label for the module/)
    .it('throws error for empty label', () => {
    });

  test
    .stdout()
    .stderr()
    .prompt(['MyNamespace', 'test'.repeat(1000)])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog'])
    .catch(/Please enter a valid label for the module/)
    .it('throws error for too long label', () => {
    });

  test
    .stdout()
    .stderr()
    .prompt(['  MyNamespace', '  Testlabel'])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog'])
    .it('creates module successfully', (ctx) => {
      const projectConfig = yaml.safeLoad(readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString());
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
        readFileSync(path.join(ctx.workspace!, 'modules', 'blog', 'slicknode.yml')).toString()
      );
      expect(moduleConfig).to.deep.equal({
        module:{
          id: '@private/blog',
          label: 'Testlabel',
          namespace: 'MyNamespace'
        }
      });
    });

  test
    .stdout()
    .stderr()
    .prompt([null, null])
    .workspaceCommand(projectPath('base'), ['module:create', 'page'])
    .it('creates module with default namespace / label values', (ctx) => {
      const projectConfig = yaml.safeLoad(readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString());
      expect(projectConfig).to.deep.equal({
        dependencies: {
          '@private/page': './modules/page',
          auth: 'latest',
          core: 'latest',
          relay: 'latest'
        }
      });
      expect(ctx.stdout).to.contain('SUCCESS! Module was created');
      expect(ctx.stdout).to.contain('Add your type definitions to ./modules/page/schema.graphql');

      const moduleConfig = yaml.safeLoad(
        readFileSync(path.join(ctx.workspace!, 'modules', 'page', 'slicknode.yml')).toString()
      );

      expect(moduleConfig).to.deep.equal({
        module:{
          id: '@private/page',
          label: 'Page',
          namespace: 'Page'
        }
      });
    });

  test
    .stdout()
    .stderr()
    .prompt(['Testlabel  '])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog', '--namespace', 'FlagNamespace'])
    .it('uses namespace from flag', (ctx) => {
      const projectConfig = yaml.safeLoad(readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString());
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
        readFileSync(path.join(ctx.workspace!, 'modules', 'blog', 'slicknode.yml')).toString()
      );
      expect(moduleConfig).to.deep.equal({
        module:{
          id: '@private/blog',
          label: 'Testlabel',
          namespace: 'FlagNamespace'
        }
      });
    });

  test
    .stdout()
    .stderr()
    .prompt(['TestNamespace'])
    .workspaceCommand(projectPath('base'), ['module:create', 'blog', '--label', 'My label'])
    .it('uses label from flag', (ctx) => {
      const projectConfig = yaml.safeLoad(readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString());
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

      const rawModuleConfig = readFileSync(path.join(ctx.workspace!, 'modules', 'blog', 'slicknode.yml')).toString();
      const moduleConfig = yaml.safeLoad(rawModuleConfig);
      expect(moduleConfig).to.deep.equal({
        module:{
          id: '@private/blog',
          label: 'My label',
          namespace: 'TestNamespace'
        }
      });
    });

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), ['module:create', 'blog', '--namespace', '12345invalid'])
    .catch(/Value "12345invalid" is not a valid namespace/)
    .it('throws error for invalid namespace via flag', (ctx) => {});
});
