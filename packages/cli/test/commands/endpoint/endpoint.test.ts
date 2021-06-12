import { expect, test } from '../../test';
import * as path from 'path';

function projectPath(name: string) {
  return path.join(__dirname, 'testprojects', name);
}

describe('endpoint', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .command(['endpoint', '--dir', projectPath('empty')])
    .catch(/The directory is not a valid slicknode project/)
    .it('fails for folder without slicknode.yml', (ctx) => {});

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .command(['endpoint', '--dir', projectPath('initialized')])
    .it('prints API endpoint', (ctx) => {
      expect(ctx.stdout).to.equal(
        'http://test-ad2f5a5e.dev.slicknode.local:30081\n'
      );
    });
});
