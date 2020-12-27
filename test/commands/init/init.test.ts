import {expect, test} from '../../test';
import {LIST_CLUSTER_QUERY, CREATE_PROJECT_MUTATION} from '../../../src/commands/init';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import {DefinitionNode, DocumentNode, Kind, ObjectTypeDefinitionNode, parse} from 'graphql';
import nock = require('nock');

const clusterResult = {
  data: {
    listCluster: {
      edges: [
        {
          node: {
            id: 'Q2x1c3Rlcjox',
            alias: 'gcp.us-east1',
            name: 'Google US East 1 (South Carolina)',
            pingUrl: 'http://ping.us-east1.slicknode.com/'
          }
        }
      ]
    }
  }
};

describe('init', () => {
  const EMPTY_DIR = path.join(__dirname, 'testprojects', 'empty');

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, {data: null, errors: [{message: 'Error'}]})
    .command(['init'])
    .catch('Could not load available clusters. Make sure you have a working internet connection and try again.')
    .it('shows error when cluster could not be loaded', ctx => {
      // expect(ctx.stderr).to.contain('done');
    });

  test
    .stdout()
    .login()
    .command(['init', '--dir', path.join(__dirname, 'testprojects', 'initialized')])
    .catch('The directory is already initialized as a slicknode project')
    .it('checks if project is already initialized', ctx => {

    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: null, errors: [{message: 'Error'}]})
    .command(['init', '--dir', EMPTY_DIR])
    .catch('Initialization failed: ERROR: Could not create project. Please try again later.\nError')
    .it('shows error for failed project creation', ctx => {
    });

  test
    .stdout()
    .stderr()
    .login()
    // @TODO: Set working directory for command test to something in the tests folder
    .command(['init', 'test',])
    .catch(/The directory already exists and is not empty/)
    .it('ensures target directory is empty when initialized with name', ctx => {
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
        }
      }
    }})
    .command(['init', '--dir', EMPTY_DIR])
    .catch(/Initialization failed: Project was created but could not be fully initialized/)
    .it('fails for successful creation but incomplete setup', ctx => {
      // expect(ctx.stdout).to.contain('Creating project');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .command(['init', '--dir', EMPTY_DIR])
    .catch(/Initialization failed/)
    .it('fails when bundle cannot be loaded', ctx => {
      // expect(ctx.stdout).to.contain('Creating project');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .workspaceCommand(EMPTY_DIR, ['init'])
    .it('initializes project successfully', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

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

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir'])
    .it('initializes project successfully and creates directory', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml')).toString()
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
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');
    });

  test
    .stdout()
    .stderr()
    .login()
    .command(['init', 'my-name', '!"§$%&', '--dir', EMPTY_DIR])
    .catch(/The template URL is invalid or has an unsupported format/)
    .it('fails for invalid project template URL', ctx => {
    });

  test
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template'
    ])
    .login()
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir', 'http://0.0.0.0/some.git'])
    .catch(/Error loading project template: Error cloning repository/)
    .it('fails for valid but unreachable template URL', ctx => {});

  test
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template'
    ])
    .login()
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir', 'https://github.com/slicknode/starter-nextjs-blog.git#invalidreference'])
    .catch(/Error checking out git reference "invalidreference"/)
    .it('fails for invalid git reference', ctx => {});

  test
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template',
      'Installing node dependencies',
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost1',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip')),
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost1/fakeversionbundle.zip'
          }
        }
      }
    }})
    .timeout(180000)
    .workspaceCommand(EMPTY_DIR, ['init', 'test-dir', 'https://github.com/slicknode/starter-nextjs-blog.git'])
    .it('initializes project successfully from template URL', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml')).toString()
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
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');

      // Check if blog module was downloaded from git
      const blogSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', 'modules', 'blog', 'schema.graphql')
        ).toString(),
      );
      expect(blogSchema.kind).to.equal(Kind.DOCUMENT);
      expect(blogSchema.definitions.length).to.be.above(1);

      const postType: DefinitionNode = blogSchema.definitions[0] as ObjectTypeDefinitionNode;
      expect(postType.kind).to.equal(Kind.OBJECT_TYPE_DEFINITION);
      expect(postType.name.value).to.equal('Blog_Post');

      // Check if node_modules was installed
      const nextPackageJson = JSON.parse(fs.readFileSync(
        path.join(ctx.workspace!, 'test-dir', 'node_modules', 'next', 'package.json')
      ).toString());
      expect(nextPackageJson.name).to.equal('next');
    });


  test
    .stdout()
    .stderr()
    .cliActions([
      'Loading project template',
      'Installing node dependencies',
      'Load available clusters',
      'Deploying project to cluster',
      'Update local files',
    ])
    .login()
    .nock(
      'http://localhost',
       loader => loader.get('/fakeversionbundle.zip').replyWithFile(200, path.join(__dirname, 'testprojects', 'testbundle.zip'))
    )
    .api(LIST_CLUSTER_QUERY, clusterResult)
    .api(CREATE_PROJECT_MUTATION, {data: {
      createProject: {
        node: {
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName',
          version: {
            id: 'someid',
            bundle: 'http://localhost/fakeversionbundle.zip'
          }
        }
      }
    }})
    .timeout(180000)
    .workspaceCommand(EMPTY_DIR, [
      'init',
      'test-dir',
      'https://github.com/slicknode/starter-nextjs-blog.git#b3262fc1ac2793e7199ba8b2b546d767c45ad4e2'
    ])
    .it('initializes project successfully from commit hash', ctx => {
      // Check slicknoderc contents
      const slicknodeRc = JSON.parse(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', '.slicknoderc')).toString()
      );
      expect(slicknodeRc).to.deep.equal({
        default: {
          version: 'someid',
          id: '234',
          endpoint: 'http://testproject',
          name: 'TestName'
        },
      });

      // Check slicknode.yml content
      const slicknodeYml = yaml.safeLoad(
        fs.readFileSync(path.join(ctx.workspace!, 'test-dir', 'slicknode.yml')).toString()
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
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'slicknode.yml')
        ).toString(),
      );
      expect(coreModuleYml).to.deep.equal({ module: { id: 'core', label: 'Core' } });

      // Check schema.graphql of core module
      const coreSchema = parse(
        fs.readFileSync(
          path.join(ctx.workspace!, 'test-dir', '.slicknode', 'cache', 'modules', 'core', 'schema.graphql')
        ).toString(),
      );
      expect(coreSchema.kind).to.equal(Kind.DOCUMENT);
      expect(coreSchema.definitions.length).to.be.above(5);

      expect(ctx.stdout).to.contain('Endpoint: http://testproject');
      expect(ctx.stdout).to.contain('Name: TestName');

      // Check if node_modules was installed
      const packageJson = JSON.parse(fs.readFileSync(
        path.join(ctx.workspace!, 'test-dir', 'package.json')
      ).toString());
      expect(packageJson.dependencies).to.deep.equal({
        next: '^9.5.3',
        react: '^16.13.1',
        'react-dom': '^16.13.1'
      });
    });
});
