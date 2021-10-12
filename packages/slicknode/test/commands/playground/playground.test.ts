import { expect, test } from '../../test';
import * as path from 'path';
import * as sinon from 'sinon';
import {
  GET_PLAYGROUND_URL_QUERY,
  default as PlaygroundCommand,
} from '../../../src/commands/playground';
import { GET_ACCOUNTS_QUERY } from '../../../src/utils/getAccounts';
import { CREATE_PROJECT_MUTATION } from '../../../src/utils/createExternalProject';
import fs from 'fs-extra';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const DUMMY_PLAYGROUND_URL = 'http://localhost/playground';

describe('playground', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .cliActions([])
    .command(['playground', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode.yml file/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .env({
      SLICKNODE_ADMIN_SECRET: null,
    })
    .cliActions([
      'Loading accounts',
      'Adding project to console (Account: "accountalias")',
      'Adding generated SLICKNODE_ADMIN_SECRET to .env file',
      'Adding environment "test" to .slicknoderc',
      'Opening playground in browser window',
    ])
    .api(GET_PLAYGROUND_URL_QUERY, {
      data: {
        project: {
          playgroundUrl: DUMMY_PLAYGROUND_URL,
        },
      },
    })
    .api(GET_ACCOUNTS_QUERY, {
      data: {
        viewer: {
          user: {
            accounts: {
              edges: [
                {
                  node: {
                    account: {
                      id: 'accountid',
                      identifier: 'accountalias',
                      name: 'Account Name',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })
    .api(CREATE_PROJECT_MUTATION, {
      data: {
        createProject: {
          node: {
            id: 'projectid1',
          },
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(PlaygroundCommand.prototype, 'openUrl');
    })
    .prompt([true, 'Local project', 'http://localhost:3000', null])
    .workspaceCommand(projectPath('initialized'), [
      'playground',
      '--env',
      'test',
    ])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it(
      'creates external project for non existing environment',
      async (ctx) => {
        expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.true;

        // Check if environment was added to .slicknoderc
        const config = (
          await fs.readJSON(path.join(String(ctx.workspace), '.slicknoderc'))
        ).test;
        expect(config.alias).to.include('local-project-');
        expect(config.endpoint).to.equal('http://localhost:3000');
        expect(config.name).to.equal('Local project');
        expect(config.id).to.equal('projectid1');

        // Check if admin secret was added to .env file
        const envFile = (
          await fs.readFile(path.join(String(ctx.workspace), '.env'))
        ).toString('utf-8');
        expect(envFile).contains('SLICKNODE_ADMIN_SECRET=');
      }
    );

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .env({
      SLICKNODE_ADMIN_SECRET: null,
    })
    .cliActions([
      'Loading accounts',
      'Adding project to console (Account: "accountalias2")',
      'Adding generated SLICKNODE_ADMIN_SECRET to .env file',
      'Adding environment "test" to .slicknoderc',
      'Opening playground in browser window',
    ])
    .api(GET_PLAYGROUND_URL_QUERY, {
      data: {
        project: {
          playgroundUrl: DUMMY_PLAYGROUND_URL,
        },
      },
    })
    .api(GET_ACCOUNTS_QUERY, {
      data: {
        viewer: {
          user: {
            accounts: {
              edges: [
                {
                  node: {
                    account: {
                      id: 'accountid1',
                      identifier: 'accountalias1',
                      name: 'Account Name1',
                    },
                  },
                },
                {
                  node: {
                    account: {
                      id: 'accountid2',
                      identifier: 'accountalias2',
                      name: 'Account Name2',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })
    .api(CREATE_PROJECT_MUTATION, {
      data: {
        createProject: {
          node: {
            id: 'projectid1',
          },
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(PlaygroundCommand.prototype, 'openUrl');
    })
    .prompt([
      true,
      'Local project',
      'accountalias2',
      'http://localhost:3000',
      null,
    ])
    .workspaceCommand(projectPath('initialized'), [
      'playground',
      '--env',
      'test',
    ])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('shows prompt for multiple available user accounts', async (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.true;

      // Check if environment was added to .slicknoderc
      const config = (
        await fs.readJSON(path.join(String(ctx.workspace), '.slicknoderc'))
      ).test;
      expect(config.alias).to.include('local-project-');
      expect(config.endpoint).to.equal('http://localhost:3000');
      expect(config.name).to.equal('Local project');
      expect(config.id).to.equal('projectid1');

      // Check if admin secret was added to .env file
      const envFile = (
        await fs.readFile(path.join(String(ctx.workspace), '.env'))
      ).toString('utf-8');
      expect(envFile).contains('SLICKNODE_ADMIN_SECRET=');
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .env({
      SLICKNODE_ADMIN_SECRET: null,
    })
    .api(GET_PLAYGROUND_URL_QUERY, {
      data: {
        project: {
          playgroundUrl: DUMMY_PLAYGROUND_URL,
        },
      },
    })
    .cliActions([
      'Loading accounts',
      'Adding project to console (Account: "accountalias2")',
      'Adding generated SLICKNODE_ADMIN_SECRET to .env file',
      'Adding environment "default" to .slicknoderc',
      'Opening playground in browser window',
    ])
    .api(GET_ACCOUNTS_QUERY, {
      data: {
        viewer: {
          user: {
            accounts: {
              edges: [
                {
                  node: {
                    account: {
                      id: 'accountid1',
                      identifier: 'accountalias1',
                      name: 'Account Name1',
                    },
                  },
                },
                {
                  node: {
                    account: {
                      id: 'accountid2',
                      identifier: 'accountalias2',
                      name: 'Account Name2',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })
    .api(CREATE_PROJECT_MUTATION, {
      data: {
        createProject: {
          node: {
            id: 'projectid1',
          },
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(PlaygroundCommand.prototype, 'openUrl');
    })
    .prompt([
      true,
      'Local project',
      'accountalias2',
      'http://localhost:3000',
      null,
    ])
    .workspaceCommand(projectPath('no-environment'), ['playground'])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('creates default environment for external project', async (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.true;

      // Check if environment was added to .slicknoderc
      const config = (
        await fs.readJSON(path.join(String(ctx.workspace), '.slicknoderc'))
      ).default;
      expect(config.alias).to.include('local-project-');
      expect(config.endpoint).to.equal('http://localhost:3000');
      expect(config.name).to.equal('Local project');
      expect(config.id).to.equal('projectid1');

      // Check if admin secret was added to .env file
      const envFile = (
        await fs.readFile(path.join(String(ctx.workspace), '.env'))
      ).toString('utf-8');
      expect(envFile).contains('SLICKNODE_ADMIN_SECRET=');
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .api(GET_PLAYGROUND_URL_QUERY, {
      data: {
        project: {
          playgroundUrl: DUMMY_PLAYGROUND_URL,
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(PlaygroundCommand.prototype, 'openUrl');
    })
    .command(['playground', '--dir', projectPath('initialized')])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('opens playground', (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .api(GET_PLAYGROUND_URL_QUERY, {
      data: {
        project: null,
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(PlaygroundCommand.prototype, 'openUrl');
    })
    .command(['playground', '--dir', projectPath('initialized')])
    .catch(/Could not load project playground URL/)
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('fails if project cannot be loaded', (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.false;
    });
});
