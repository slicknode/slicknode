import {expect, test} from '../../test';
import path from 'path';
import sinon, {SinonStub} from 'sinon';
import * as utils from '../../../src/utils';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('console', () => {
  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .command(['console', '--dir', projectPath('empty')])
    .catch(/The directory is not a valid slicknode project/)
    .it('fails for folder without slicknode.yml', ctx => {
    });

  test
    .stdout({stripColor: true, print: true})
    .stderr({stripColor: true, print: true})
    .do((ctx: {stub?: SinonStub}) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['console', '--dir', projectPath('initialized')])
    .it('opens console', ctx => {
      expect(ctx.stub!.calledWith('http://localhost:3001/p/test-ad2f5a5e')).to.be.true;
    });
});
