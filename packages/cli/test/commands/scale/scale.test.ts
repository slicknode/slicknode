import { expect, test } from '../../test';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import { DELETE_PROJECT_MUTATION } from '../../../src/commands/delete';
import { readFileSync } from 'fs';
import { UPDATE_DEPLOYMENT_MUTATION } from '../../../src/commands/scale';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('scale', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .command(['scale', '--dir', projectPath('empty')])
    .catch(/This directory does not have a valid slicknode.yml file/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .api(
      {
        query: UPDATE_DEPLOYMENT_MUTATION,
        variables: {
          input: {
            active: true,
            project: 'UHJvamVjdDoy',
            apiMin: 2,
            apiMax: 5,
          },
        },
      },
      { data: null }
    )
    .command(['scale', '--api', '2-5', '--dir', projectPath('initialized')])
    .it('scales api with range successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment successfully scaled!');
    });

  test
    .login()
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .api(
      {
        query: UPDATE_DEPLOYMENT_MUTATION,
        variables: {
          input: {
            active: true,
            project: 'UHJvamVjdDoy',
            apiMin: 5,
            apiMax: 5,
          },
        },
      },
      { data: null }
    )
    .command(['scale', '--api', '5', '--dir', projectPath('initialized')])
    .it('scales api with single value successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Deployment successfully scaled!');
    });
});
