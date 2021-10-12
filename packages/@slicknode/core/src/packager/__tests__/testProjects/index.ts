/**
 * Created by Ivo Meißner on 14.09.17.
 *
 */
import originalGlob from 'glob';
import AdmZip from 'adm-zip';
import { promisify } from 'util';
import path from 'path';

const glob = promisify(originalGlob);

/**
 * Gets the project archive file for the given name
 *
 * @param name
 * @returns {Promise.<void>}
 */
export async function getArchive(name: string): Promise<AdmZip> {
  const zip = new AdmZip();
  const files = await glob(`${__dirname}/${name}/**/*.*`);
  (files || []).forEach((file) => {
    const archivePath = file.substr(__dirname.length + name.length + 2);
    const dirs = archivePath.split('/');
    dirs.pop();
    zip.addLocalFile(file, dirs.join('/'));
  });

  // @TODO: Write to disk and reread, otherwise AdmZip does not work correctly
  // and entires are not present. Could be improved if we could work with buffers...
  const archivePath = path.resolve(__dirname, '../tmp/testproject.zip');
  zip.writeZip(archivePath);

  return new AdmZip(archivePath);
}
