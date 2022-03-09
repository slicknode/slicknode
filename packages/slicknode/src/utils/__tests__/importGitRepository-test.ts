import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { ensureDir, readdir, readFile, remove, writeFile } from 'fs-extra';
import os from 'os';
import * as path from 'path';
import * as uuid from 'uuid';
import { importGitRepository } from '../importGitRepository';

chai.use(chaiAsPromised);

describe('importGitRepository', () => {
  let dir: string;
  const REPO_PATH = path.join(__dirname, 'fixtures', 'project-repo');

  beforeEach(async () => {
    // Create test dir
    dir = path.join(os.tmpdir(), uuid.v4());
    await ensureDir(dir);
  });

  afterEach(async () => {
    // Cleanup test dir
    await remove(dir);
  });

  it('loads git repository into folder', async () => {
    await importGitRepository({
      repository: REPO_PATH,
      targetDir: dir,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files removed
    expect(files).to.not.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8')
    );
    expect(result.main).to.equal('index.js');
  });

  it('loads git repository into folder keeping .git files', async () => {
    await importGitRepository({
      repository: REPO_PATH,
      targetDir: dir,
      keepGit: true,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files kept
    expect(files).to.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8')
    );
    expect(result.main).to.equal('index.js');
  });

  it('can checkout specific commit hash', async () => {
    await importGitRepository({
      repository: `${REPO_PATH}#94ded0d013ba309a90023ad48503c038f68918dd`,
      targetDir: dir,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files removed
    expect(files).to.not.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8')
    );
    expect(result.name).to.equal('slicknode-project-template-ci');
    expect(result.version).to.equal('1.0.0');
  });

  it('throws error if directory is not empty', async () => {
    // Create a file in dir
    await writeFile(path.join(dir, 'testfile.txt'), 'test');

    return expect(
      importGitRepository({
        repository: REPO_PATH,
        targetDir: dir,
      })
    ).to.eventually.rejectedWith('The directory is not empty');
  });

  it('clears files from dir if is not empty with force option', async () => {
    // Create a file in dir
    const existingFileName = 'testfile.txt';
    await writeFile(path.join(dir, existingFileName), 'test');

    await importGitRepository({
      repository: REPO_PATH,
      targetDir: dir,
      force: true,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // No .git files kept
    expect(files).to.not.include('.git');

    // Existing file removed
    expect(files).to.not.include(existingFileName);

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8')
    );
    expect(result.main).to.equal('index.js');
  });

  it('throws error for invalid git repo', async () => {
    return expect(
      importGitRepository({
        repository: 'https://example.com/doesnotexist',
        targetDir: dir,
      })
    ).to.eventually.rejectedWith('Error cloning repository');
  });

  it('throws error for invalid git reference', async () => {
    return expect(
      importGitRepository({
        repository: `${REPO_PATH}#invalidreference`,
        targetDir: dir,
      })
    ).to.eventually.rejectedWith(
      'Error checking out git reference "invalidreference"'
    );
  });
});
