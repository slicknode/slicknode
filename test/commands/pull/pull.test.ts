import {expect, test} from '../../test';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import {Kind, parse} from 'graphql';
import {LOAD_PROJECT_BUNDLE_QUERY} from '../../../src/commands/pull';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('pull', () => {
  test
    .login()
    .api(LOAD_PROJECT_BUNDLE_QUERY, {data: null, errors: [{message: 'Error'}]})
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('initialized'), ['pull'])
    .catch('Error loading project source: Error')
    .it('shows error when source could not be loaded from API', ctx => {
    });

  test
    .login()
    .stdout()
    .stderr()
    .workspaceCommand(projectPath('empty'), ['pull'])
    .catch(/This directory does not have a valid slicknode\.yml file/)
    .it('fails in dir without slicknode.yml file', () => {
    });

  test
    .stdout()
    .stderr()
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LOAD_PROJECT_BUNDLE_QUERY, {data: {
      project: {
        id: '234',
        endpoint: 'http://testproject',
        name: 'TestName',
        version: {
          id: 'someid',
          bundle: 'http://localhost/fakeversionbundle.zip'
        }
      }
    }})
    .workspaceCommand(projectPath('initialized'), ['pull'])
    .it('pulls project sources successfully', ctx => {
      expect(ctx.stdout).to.contain('Local source was successfully updated');
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, '.slicknoderc')).toString()
      );

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          '@private/test-app': './modules/test-app',
          auth: 'latest',
          core: 'latest',
          image: 'latest',
          relay: 'latest',
        }
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs.readFileSync(
          path.join(ctx.workspace!, '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);
    });
});
