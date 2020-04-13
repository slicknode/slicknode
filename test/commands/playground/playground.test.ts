import {expect, test} from '../../test';
import path from 'path';
import sinon, {SinonStub} from 'sinon';
import * as utils from '../../../src/utils';
import {GET_PLAYGROUND_URL_QUERY} from '../../../src/commands/playground';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

const DUMMY_PLAYGROUND_URL = 'http://localhost/playground';

describe('playground', () => {
  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .command(['playground', '--dir', projectPath('empty')])
    .catch(/The directory is not a valid slicknode project/)
    .it('fails for folder without slicknode.yml', ctx => {
    });

  test
    .stdout({stripColor: true, print: true})
    .stderr({stripColor: true, print: true})
    .login()
    .api(GET_PLAYGROUND_URL_QUERY, {data: {
      project: {
        playgroundUrl: DUMMY_PLAYGROUND_URL
      }
    }})
    .do((ctx: {stub?: SinonStub}) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['playground', '--dir', projectPath('initialized')])
    .finally(ctx => {
      ctx.stub!.restore();
    })
    .it('opens playground', ctx => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.true;
    });

  test
    .stdout({stripColor: true, print: true})
    .stderr({stripColor: true, print: true})
    .login()
    .api(GET_PLAYGROUND_URL_QUERY, {data: {
      project: null
    }})
    .do((ctx: {stub?: SinonStub}) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['playground', '--dir', projectPath('initialized')])
    .catch(/Could not load project playground URL/)
    .finally(ctx => {
      ctx.stub!.restore();
    })
    .it('fails if project cannot be loaded', ctx => {
      expect(ctx.stub!.calledWith(DUMMY_PLAYGROUND_URL)).to.be.false;
    });
});
