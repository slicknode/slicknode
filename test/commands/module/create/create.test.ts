import path from 'path';
import {expect} from '@oclif/test';
import os from 'os';
import * as uuid from 'uuid';
import copyfiles from 'copyfiles';
import {mkdirpSync, readFileSync} from 'fs-extra';
import {test} from '../../../test';
import yaml from 'js-yaml';
import remoteSchemaInvalid from './fixtures/remote-schema-invalid.json';
import remoteSchema from './fixtures/remote-schema.json';
import {assertObjectType, buildSchema, introspectionFromSchema, printSchema} from 'graphql';

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
    .prompt(['  MyNamespace', '  Testlabel'])
    .nock(
      'http://remoteexample.com',
       loader => loader.post('/graphql').reply(200, {data: remoteSchema})
    )
    .workspaceCommand(projectPath('base'), ['module:create', 'blog', '--endpoint', 'http://remoteexample.com/graphql'])
    .it('creates remote module successfully', (ctx) => {
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
          namespace: 'MyNamespace',
          remote: {
            endpoint: 'http://remoteexample.com/graphql',
          },
        },
      });
    });

  test
    .stdout()
    .stderr()
    .prompt(['  MyNamespace', '  Testlabel'])
    .nock(
      'http://remoteexample.com',
      {
        reqheaders: {
          'header-1': 'Val',
          'header-2': 'Val2',
        },
      },
       loader => loader.post('/graphql').reply(200, {data: remoteSchema}),
    )
    .workspaceCommand(projectPath('base'), [
      'module:create', 'blog',
      '--endpoint', 'http://remoteexample.com/graphql',
      '-h', 'Header-1: Val',
      '-h', 'Header-2: Val2',
    ])
    .it('creates remote module with HTTP headers successfully', (ctx) => {
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
        module: {
          id: '@private/blog',
          label: 'Testlabel',
          namespace: 'MyNamespace',
          remote: {
            endpoint: 'http://remoteexample.com/graphql',
            headers: {
              'Header-1': 'Val',
              'Header-2': 'Val2',
            },
          },
        },
      });

      // Test if schema was imported
      const schema = buildSchema(
        readFileSync(path.join(ctx.workspace!, 'modules', 'blog', 'schema.graphql')).toString()
      );
      expect(schema.getType('Query')?.name).to.equal('Query');
      expect(assertObjectType(schema.getType('Query')).getFields().user.name).to.equal('user');
    });

  test
    .stdout()
    .stderr()
    .prompt(['  MyNamespace', '  Testlabel'])
    .nock(
      'http://remoteexample.com',
       loader => loader.post('/graphql').reply(403),
    )
    .workspaceCommand(projectPath('base'), [
      'module:create', 'blog',
      '--endpoint', 'http://remoteexample.com/graphql',
    ])
    .catch(/Error loading remote GraphQL schema: Response code 403/)
    .it('throws error for invalid HTTP responses code', (ctx) => {

    });

  test
    .stdout()
    .stderr()
    .prompt(['  MyNamespace', '  Testlabel'])
    .nock(
      'http://remoteexample.com',
       loader => loader.post('/graphql').reply(200, {data: remoteSchemaInvalid}),
    )
    .workspaceCommand(projectPath('base'), [
      'module:create', 'blog',
      '--endpoint', 'http://remoteexample.com/graphql',
    ])
    .catch(/Error loading remote GraphQL schema: Invalid or incomplete introspection result/)
    .it('throws error for invalid remote introspection result', (ctx) => {});

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), [
      'module:create', 'blog',
      '--endpoint', 'http://remoteexample.com/graphql',
      '-h', 'InvalidHeader'
    ])
    .catch(/Please enter a valid header name in the format "Name: Value"/)
    .it('throws error for invalid header value', (ctx) => {});

  test
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('base'), [
      'module:create', 'blog',
      '--endpoint', 'ssh://remoteexample.com/graphql',
    ])
    .catch(/Value "ssh:\/\/remoteexample\.com\/graphql" is not a valid URL/)
    .it('throws error for invalid endpoint URL', (ctx) => {});

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
