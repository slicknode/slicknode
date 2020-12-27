import {execFile, execSync} from 'child_process';
import {emptyDir, ensureDir, readdir, remove} from 'fs-extra';
import path from 'path';
import {promisify} from 'util';
import {shellEscape} from './string';

const exec = promisify(execFile);

interface IImportGitRepositoryParams {
  // Repository, optionally with a git reference
  // Fetch master: "https://github.com/slicknode/slicknode.git"
  // Specific commit hash: "https://github.com/slicknode/slicknode.git#5e2fd55e355244fc819d7b29aa86d11dbcae34d6"
  // Specific branch: "https://github.com/slicknode/slicknode.git#develop"
  repository: string;

  // Target dir to import files to
  targetDir: string;

  // Delete files in targetDir automatically
  force?: boolean;

  // Keep the git repository
  keepGit?: boolean;
}

/**
 * Clones a git repository and extracts the content to the target dir
 * @param params
 */
export async function importGitRepository(params: IImportGitRepositoryParams) {
  const [repository, reference] = params.repository.split('#');
  const dir = path.resolve(params.targetDir);

  // Check if target directory exists and is empty
  await ensureDir(dir);

  const files = await readdir(dir);
  if (files.length) {
    if (params.force) {
      await emptyDir(dir);
    } else {
      throw new Error(`The directory is not empty: ${dir}`);
    }
  }

  // Clone repository
  try {
    const gitCloneCmd = shellEscape('git', 'clone', ...(!reference ? ['--depth', '1'] : []), repository, dir);
    const result = await exec('git', ['clone', ...(!reference ? ['--depth', '1'] : []), repository, dir]);
    /*
    const result = execSync(gitCloneCmd, {
      encoding: 'utf8',
      stdio: 'pipe',
    });
     */
  } catch (e) {
    throw new Error(`Error cloning repository "${params.repository}", please provide a valid repository URL: ${e.message}`);
  }

  // Checkout specific git reference if provided
  if (reference) {
    try {
      const gitCheckoutCmd = await exec('git', ['checkout', reference], {
        cwd: dir,
        encoding: 'utf8',
      });
      /*
      execSync(gitCheckoutCmd, {
        cwd: dir,
        encoding: 'utf8',
        stdio: 'pipe',
      });
       */
    } catch (e) {
      throw new Error(`Error checking out git reference "${reference}", make sure you are specifying a valid branch or commit hash: ${e.message}`);
    }
  }

  // Remove .git files
  if (!params.keepGit) {
    await remove(path.join(dir, '.git'));
  }
}
