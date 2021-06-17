import { expect, test } from '../../test';
import * as path from 'path';
import * as sinon from 'sinon';
import * as utils from '../../../src/utils';
import { GET_CONSOLE_URL_QUERY } from '../../../src/commands/console';
import { DEFAULT_CONSOLE_URL } from '../../../src/config';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const DUMMY_CONSOLE_URL = 'http://localhost/console';

describe('console', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['console', '--dir', projectPath('empty')])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('opens default console URL for folder without slicknode.yml', (ctx) => {
      expect(ctx.stub!.calledWith(DEFAULT_CONSOLE_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true, print: true })
    .stderr({ stripColor: true, print: true })
    .login()
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: {
          consoleUrl: DUMMY_CONSOLE_URL,
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['console', '--dir', projectPath('initialized')])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('opens console', (ctx) => {
      expect(ctx.stub!.calledWith(DUMMY_CONSOLE_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true, print: true })
    .stderr({ stripColor: true, print: true })
    .login()
    .api(GET_CONSOLE_URL_QUERY, {
      data: {
        project: null,
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
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
