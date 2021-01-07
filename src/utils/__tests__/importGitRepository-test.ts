import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {ensureDir, readdir, readFile, remove, writeFile} from 'fs-extra';
import os from 'os';
import path from 'path';
import * as uuid from 'uuid';
import {importGitRepository} from '../importGitRepository';

chai.use(chaiAsPromised);

describe('importGitRepository', () => {
  let dir: string;

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
      repository: 'https://github.com/slicknode/slicknode.git',
      targetDir: dir,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files removed
    expect(files).to.not.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8'),
    );
    expect(result.name).to.equal('slicknode');
  });

  it('loads git repository into folder keeping .git files', async () => {
    await importGitRepository({
      repository: 'https://github.com/slicknode/slicknode.git',
      targetDir: dir,
      keepGit: true,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files kept
    expect(files).to.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8'),
    );
    expect(result.name).to.equal('slicknode');
  });

  it('can checkout specific commit hash', async () => {
    await importGitRepository({
      repository: 'https://github.com/slicknode/slicknode.git#5e2fd55e355244fc819d7b29aa86d11dbcae34d6',
      targetDir: dir,
    });

    const files = await readdir(dir);
    expect(files.length).to.greaterThan(1);

    // .git files removed
    expect(files).to.not.include('.git');

    const result = JSON.parse(
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8'),
    );
    expect(result.name).to.equal('slicknode');
    expect(result.version).to.equal('0.7.0');
  });

  it('throws error if directory is not empty', async () => {
    // Create a file in dir
    await writeFile(path.join(dir, 'testfile.txt'), 'test');

    return expect(importGitRepository({
      repository: 'https://github.com/slicknode/slicknode.git',
      targetDir: dir,
    })).to.eventually.rejectedWith('The directory is not empty');
  });

  it('clears files from dir if is not empty with force option', async () => {
    // Create a file in dir
    const existingFileName = 'testfile.txt';
    await writeFile(path.join(dir, existingFileName), 'test');

    await importGitRepository({
      repository: 'https://github.com/slicknode/slicknode.git',
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
      (await readFile(path.join(dir, 'package.json'))).toString('utf-8'),
    );
    expect(result.name).to.equal('slicknode');
  });

  it('throws error for invalid git repo', async () => {
    return expect(importGitRepository({
      repository: 'https://example.com/doesnotexist',
      targetDir: dir,
    })).to.eventually.rejectedWith('Error cloning repository');
  });

  it('throws error for invalid git reference', async () => {
    return expect(importGitRepository({
      repository: 'https://github.com/slicknode/slicknode.git#invalidreference',
      targetDir: dir,
    })).to.eventually.rejectedWith('Error checking out git reference "invalidreference"');
  });
});
