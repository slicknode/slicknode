import { expect, test } from '../../test';
import * as path from 'path';
import * as sinon from 'sinon';
import {
  GET_CONSOLE_URL_QUERY,
  default as ConsoleCommand,
} from '../../../src/commands/console';
import * as ConsoleCommandModule from '../../../src/commands/console';
import { DEFAULT_CONSOLE_URL } from '../../../src/config';
import { GET_ACCOUNTS_QUERY } from '../../../src/utils/getAccounts';
import { CREATE_PROJECT_MUTATION } from '../../../src/utils/createExternalProject';
import fs from 'fs-extra';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const DUMMY_CONSOLE_URL = 'http://localhost/console';

describe('console', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .command(['console', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode.yml file/)
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('fails in folder without valid slicknode.yml', (ctx) => {});

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
      'Opening console in browser window',
    ])
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: {
          consoleUrl: DUMMY_CONSOLE_URL,
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
    .do((ctx: { stub: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .prompt([true, 'Local project', 'http://localhost:3000', null])
    .workspaceCommand(projectPath('initialized'), ['console', '--env', 'test'])
    .finally((ctx) => {
      ctx.stub.restore();
    })
    .it(
      'creates external project for non existing environment',
      async (ctx) => {
        expect(ctx.stub.calledWith(DUMMY_CONSOLE_URL)).to.be.true;

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
      'Opening console in browser window',
    ])
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: {
          consoleUrl: DUMMY_CONSOLE_URL,
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
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .prompt([
      true,
      'Local project',
      'accountalias2',
      'http://localhost:3000',
      null,
    ])
    .workspaceCommand(projectPath('initialized'), ['console', '--env', 'test'])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('shows prompt for multiple available user accounts', async (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_CONSOLE_URL)).to.be.true;

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
    .cliActions([
      'Loading accounts',
      'Adding project to console (Account: "accountalias2")',
      'Adding generated SLICKNODE_ADMIN_SECRET to .env file',
      'Adding environment "default" to .slicknoderc',
      'Opening console in browser window',
    ])
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: {
          consoleUrl: DUMMY_CONSOLE_URL,
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
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .prompt([
      true,
      'Local project',
      'accountalias2',
      'http://localhost:3000',
      null,
    ])
    .workspaceCommand(projectPath('no-environment'), ['console'])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('creates default environment for external project', async (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_CONSOLE_URL)).to.be.true;

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
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: {
          consoleUrl: DUMMY_CONSOLE_URL,
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .command(['console', '--dir', projectPath('initialized')])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('opens console', (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_CONSOLE_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login()
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: null,
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(ConsoleCommand.prototype, 'openUrl');
    })
    .command(['console', '--dir', projectPath('initialized')])
    .catch(/Could not load project console URL/)
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('fails if project cannot be loaded', (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_CONSOLE_URL)).to.be.false;
    });
});
