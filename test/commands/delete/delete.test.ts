import {expect, test} from '../../test';
import path from 'path';
import sinon, {SinonStub} from 'sinon';
import {DELETE_PROJECT_MUTATION} from '../../../src/commands/delete';
import {readFileSync} from "fs";

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('delete', () => {
  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .command(['delete', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode.yml file/)
    .it('fails for folder without slicknode.yml', ctx => {
    });

  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .prompt([ 'test-ad2f5a5e_invalid' ])
    .workspaceCommand(projectPath('initialized'), ['delete'])
    .catch(/Entered project alias does not match\. Aborting delete\./)
    .it('aborts deletion for wrong alias input', ctx => {
      expect(ctx.stderr).to.contain('WARNING: You are about to delete the project with all its data.');
    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .api(DELETE_PROJECT_MUTATION, {data: null})
    .prompt([ 'test-ad2f5a5e' ])
    .workspaceCommand(projectPath('initialized'), ['delete'])
    .it('deletes project successfully', ctx => {
      expect(ctx.stdout).to.contain('Project successfully deleted');
      const config = JSON.parse(readFileSync(path.join(ctx.workspace!, '.slicknoderc')).toString());
      expect(config).to.deep.equal({});
    });

  test
    .login()
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .api(DELETE_PROJECT_MUTATION, {data: null})
    .workspaceCommand(projectPath('initialized'), ['delete', '--force'])
    .it('skips confirmation with --force', ctx => {
      expect(ctx.stdout).to.contain('Project successfully deleted');
      const config = JSON.parse(readFileSync(path.join(ctx.workspace!, '.slicknoderc')).toString());
      expect(config).to.deep.equal({});
    });
});
