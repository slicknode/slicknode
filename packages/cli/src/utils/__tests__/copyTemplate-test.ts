import { expect } from 'chai';
import { mkdirp, readFile, remove } from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as uuid from 'uuid';
import { copyTemplate } from '../copyTemplate';

describe('copyTemplate', () => {
  let targetDir: string;
  beforeEach(async () => {
    targetDir = path.join(os.tmpdir(), uuid.v1());
    await mkdirp(targetDir);
  });

  afterEach(async () => {
    await remove(targetDir);
  });

  it('copies template to target directory', async () => {
    await copyTemplate(
      path.join(__dirname, 'fixtures', 'template1'),
      targetDir,
      {
        value: 'Blog',
      }
    );

    // Read copied files
    const schema = (
      await readFile(path.join(targetDir, 'schema.graphql'))
    ).toString();
    expect(schema).to.equal(
      'type BlogType implements Node {\n' +
        '  # Comment Blog\n' +
        '  id: ID!\n' +
        '}'
    );
    const slicknode = (
      await readFile(path.join(targetDir, 'slicknode.yml'))
    ).toString();
    expect(slicknode).to.equal('# Test Blog here\n');
  });
});
