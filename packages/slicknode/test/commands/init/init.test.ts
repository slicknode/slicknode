import { expect, test } from '../../test';
import * as path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { DefinitionNode, Kind, ObjectTypeDefinitionNode, parse } from 'graphql';
import nock = require('nock');
import { GET_REPOSITORY_URL_QUERY } from '../../../src/utils/pullDependencies';

const REGISTRY_URL = 'http://localhost/repository/';
const registryUrlResult = {
  data: { registryUrl: REGISTRY_URL },
};

describe('init', () => {
  const EMPTY_DIR = path.join(__dirname, 'testprojects', 'empty');

  test
    .stdout()
    .login()
    .command([
      'init',
      '--dir',
      path.join(__dirname, 'testprojects', 'initialized'),
    ])
    .catch('The directory is already initialized as a slicknode project')
    .it('checks if project is already initialized', (ctx) => {});

  test
    .stdout()
    .stderr()
    .login()
    // @TODO: Set working directory for command test to something in the tests folder
    .command(['init', 'test'])
    .catch(/The directory already exists and is not empty/)
    .it(
      'ensures target directory is empty when initialized with name',
      (ctx) => {}
    );

  test
    .stdout()
    .stderr()
    .cliActions(['Updating dependencies'])
    .login()
    .api(GET_REPOSITORY_URL_QUERY, registryUrlResult)
    .workspaceCommand(EMPTY_DIR, ['init'])
    .catch(/Update of module "core" failed/)
    .it('fails if module cannot be loaded from registry', (ctx) => {
      // expect(ctx.stdout).to.contain('Creating project');
    });

  mockRegistry(test)
    .stdout()
    .stderr()
    .api(GET_REPOSITORY_URL_QUERY, registryUrlResult)
    .cliActions(['Updating dependencies'])
    .login()
    .workspaceCommand(EMPTY_DIR, ['init'])
    .it('initializes project successfully', (ctx) => {
      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'slicknode.yml')).toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              '.slicknode',
              'cache',
              'modules',
              'core',
              'slicknode.yml'
            )
          )
          .toString()
      );
      expect(coreModuleYml).to.deep.equal({
        module: { id: 'core', label: 'Core' },
      });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              '.slicknode',
              'cache',
              'modules',
              'core',
              'schema.graphql'
            )
          )
          .toString()
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Project initialized');
    });

  mockRegistry(test)
    .stdout()
    .stderr()
    .cliActions(['Updating dependencies'])
    .login()
    .api(GET_REPOSITORY_URL_QUERY, registryUrlResult)
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir'])
    .it('initializes project successfully and creates directory', (ctx) => {
      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs
          .readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml'))
          .toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'slicknode.yml'
            )
          )
          .toString()
      );
      expect(coreModuleYml).to.deep.equal({
        module: { id: 'core', label: 'Core' },
      });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'schema.graphql'
            )
          )
          .toString()
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Project initialized');
    });

  test
    .stdout()
    .stderr()
    .login()
    .command(['init', 'my-name', '!"§$%&', '--dir', EMPTY_DIR])
    .catch(/The template URL is invalid or has an unsupported format/)
    .it('fails for invalid project template URL', (ctx) => {});

  test
    .stdout()
    .stderr()
    .cliActions(['Loading project template'])
    .login()
    .workspaceCommand(EMPTY_DIR, [
      'init',
      'test-dir',
      'http://0.0.0.0/some.git',
    ])
    .catch(/Error loading project template: Error cloning repository/)
    .it('fails for valid but unreachable template URL', (ctx) => {});

  test
    .stdout()
    .stderr()
    .cliActions(['Loading project template'])
    .login()
    .workspaceCommand(EMPTY_DIR, [
      'init',
      'test-dir',
      'https://github.com/slicknode/starter-nextjs-blog.git#invalidreference',
    ])
    .catch(/Error checking out git reference "invalidreference"/)
    .it('fails for invalid git reference', (ctx) => {});

  mockRegistry(test)
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template "https://github.com/slicknode/starter-nextjs-blog.git"',
      'Installing node dependencies',
      'Updating dependencies',
    ])
    .login()
    .api(GET_REPOSITORY_URL_QUERY, registryUrlResult)
    .timeout(180000)
    .workspaceCommand(EMPTY_DIR, [
      'init',
      'test-dir',
      'https://github.com/slicknode/starter-nextjs-blog.git',
    ])
    .it('initializes project successfully from template URL', (ctx) => {
      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs
          .readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml'))
          .toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          '@private/blog': './modules/blog',
          auth: 'latest',
          content: 'latest',
          core: 'latest',
          image: 'latest',
          relay: 'latest',
        },
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'slicknode.yml'
            )
          )
          .toString()
      );
      expect(coreModuleYml).to.deep.equal({
        module: { id: 'core', label: 'Core' },
      });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'schema.graphql'
            )
          )
          .toString()
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Project initialized');

      // Check if blog module was downloaded from git
      const blogSchema = parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              'modules',
              'blog',
              'schema.graphql'
            )
          )
          .toString()
      );
      expect(blogSchema.kind).to.equal(Kind.DOCUMENT);
      expect(blogSchema.definitions.length).to.be.above(1);

      const postType: DefinitionNode = blogSchema
        .definitions[0] as ObjectTypeDefinitionNode;
      expect(postType.kind).to.equal(Kind.OBJECT_TYPE_DEFINITION);
      expect(postType.name.value).to.equal('Blog_Post');

      // Check if node_modules was installed
      const nextPackageJson = JSON.parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              'node_modules',
              'next',
              'package.json'
            )
          )
          .toString()
      );
      expect(nextPackageJson.name).to.equal('next');
    });

  mockRegistry(test)
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template',
      'Installing node dependencies',
      'Updating dependencies',
    ])
    .login()
    .api(GET_REPOSITORY_URL_QUERY, registryUrlResult)
    .timeout(180000)
    .workspaceCommand(EMPTY_DIR, [
      'init',
      'test-dir',
      'https://github.com/slicknode/starter-nextjs-blog.git#b3262fc1ac2793e7199ba8b2b546d767c45ad4e2',
    ])
    .it('initializes from commit hash successfully', (ctx) => {
      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs
          .readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml'))
          .toString()
      );
      expect(slicknodeYml).to.deep.equal({
        dependencies: {
          auth: 'latest',
          core: 'latest',
          relay: 'latest',
        },
      });

      // Check if core modules were added to cache
      const coreModuleYml = yaml.safeLoad(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'slicknode.yml'
            )
          )
          .toString()
      );
      expect(coreModuleYml).to.deep.equal({
        module: { id: 'core', label: 'Core' },
      });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs
          .readFileSync(
            path.join(
              ctx.workspace!,
              'test-dir',
              '.slicknode',
              'cache',
              'modules',
              'core',
              'schema.graphql'
            )
          )
          .toString()
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Project initialized');

      // Check if node_modules was installed
      const packageJson = JSON.parse(
        fs
          .readFileSync(path.join(ctx.workspace!, 'test-dir', 'package.json'))
          .toString()
      );
      expect(packageJson.dependencies).to.deep.equal({
        next: '^9.5.3',
        react: '^16.13.1',
        'react-dom': '^16.13.1',
      });
    });
});

function mockRegistry(t: typeof test) {
  // Mock repository detail requests for modules
  const url = 'http://localhost';
  return t.nock(url, (loader) =>
    loader
      .persist(true)
      .get((uri) => {
        return uri.startsWith('/repository');
      })
      .reply(200, (uri) => {
        const file = uri.split('/').pop()!;
        if (file.endsWith('.zip')) {
          const archive = fs.readFileSync(
            path.resolve(__dirname, `./fixtures/modules/${file}`)
          );
          if (!archive) {
            throw new Error(`Fixture for module ${file} does not exist`);
          }
          return archive;
        }
        return require(`./fixtures/modules/${file}`);
      })
  );
}
