import {expect, test} from '../../test';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import {Kind, parse} from 'graphql';
import {LOAD_PROJECT_BUNDLE_QUERY} from '../../../src/commands/pull';
import {GET_REPOSITORY_URL_QUERY} from '../../../src/utils/pullDependencies';

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

    // Mock repository detail requests for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core').reply(200, require('./fixtures/modules/core.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth').reply(200, require('./fixtures/modules/auth.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay').reply(200, require('./fixtures/modules/relay.json'))
    )

    // Mock source archives for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'core_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'auth_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'relay_0.0.1.zip'))
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
    .api(GET_REPOSITORY_URL_QUERY, {data: {registryUrl: 'http://localhost/repository/'}})
    .workspaceCommand(projectPath('initialized'), ['pull'])
    .it('pulls project sources successfully', ctx => {
      expect(ctx.stdout).to.contain('Local source was successfully updated');

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

      // Check for core schema directives
      const directives = [
        'index', 'unique', 'validateEmail', 'validateLength', 'validateRegex', 'validateGid', 'validateUrl'
      ];
      for (const directive of directives) {
        const directiveDefinition = coreSchema.definitions.find(def => {
          if (def.kind === Kind.DIRECTIVE_DEFINITION) {
            return def.name.value === directive;
          }
        });
        expect(directiveDefinition).to.be.an('object');
      }
    });

  test
    .stdout()
    .stderr()
    .login()

    // Mock repository detail requests for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core').reply(200, require('./fixtures/modules/core.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth').reply(200, require('./fixtures/modules/auth.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay').reply(200, require('./fixtures/modules/relay.json'))
    )

    // Mock source archives for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'core_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'auth_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'relay_0.0.1.zip'))
    )

    .api(GET_REPOSITORY_URL_QUERY, {data: {registryUrl: 'http://localhost/repository/'}})
    .workspaceCommand(projectPath('not-initialized'), ['pull'])
    .it('pulls project sources for not initialized project', ctx => {
      expect(ctx.stdout).to.contain('Local source was successfully updated');

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
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

      // Check for core schema directives
      const directives = [
        'index', 'unique', 'validateEmail', 'validateLength', 'validateRegex', 'validateGid', 'validateUrl'
      ];
      for (const directive of directives) {
        const directiveDefinition = coreSchema.definitions.find(def => {
          if (def.kind === Kind.DIRECTIVE_DEFINITION) {
            return def.name.value === directive;
          }
        });
        expect(directiveDefinition).to.be.an('object');
      }
    });

  test
    .stdout()
    .stderr()
    .login()
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
    .api(GET_REPOSITORY_URL_QUERY, {errors: [{message: 'Internatl Server Error'}], data: null})
    .workspaceCommand(projectPath('initialized'), ['pull'])
    .catch(/Failed to load repository URL from API/)
    .it('fails if source archive cannot be loaded', () => {

    });

  test
    .stdout()
    .stderr()
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )

    // Mock repository detail requests for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth').reply(404)
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
    .api(GET_REPOSITORY_URL_QUERY, {data: {registryUrl: 'http://localhost/repository/'}})
    .workspaceCommand(projectPath('initialized'), ['pull'])
    .catch(/Update of module "auth" failed: Metadata could not be loaded. Make sure you are online and try again./)
    .it('fails if repository URL cannot be loaded', () => {

    });

  test
    .stdout()
    .stderr()
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )

    // Mock repository detail requests for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core').reply(200, require('./fixtures/modules/core.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth').reply(200, require('./fixtures/modules/auth.json'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay').reply(200, require('./fixtures/modules/relay.json'))
    )

    // Mock source archives for modules
    .nock(
      'http://localhost',
       loader => loader.get('/repository/core.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'core_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/auth.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'auth_0.0.1.zip'))
    )
    .nock(
      'http://localhost',
       loader => loader.get('/repository/relay.zip').replyWithFile(200, path.join(__dirname, 'fixtures', 'modules', 'relay_0.0.1.zip'))
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
    .api(GET_REPOSITORY_URL_QUERY, {data: {registryUrl: 'http://localhost/repository/'}})
    .workspaceCommand(projectPath('initialized-with-private-module'), ['pull'])
    .it('pulls project sources from public modules only', ctx => {
      expect(ctx.stdout).to.contain('Local source was successfully updated');

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

      // Check for core schema directives
      const directives = [
        'index', 'unique', 'validateEmail', 'validateLength', 'validateRegex', 'validateGid', 'validateUrl'
      ];
      for (const directive of directives) {
        const directiveDefinition = coreSchema.definitions.find(def => {
          if (def.kind === Kind.DIRECTIVE_DEFINITION) {
            return def.name.value === directive;
          }
        });
        expect(directiveDefinition).to.be.an('object');
      }
    });
});
