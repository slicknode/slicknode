import fs from 'fs';
import * as path from 'path';

/**
 * Throws an error if the provided value is not a valid path to a file
 * @param value
 */
export const file = () => (value: string) => {
  const resolvedPath = path.resolve(value);
  const stats = fs.lstatSync(resolvedPath);
  if (!stats || stats.isDirectory()) {
    throw new Error(`Value "${value}" is not a valid file`);
  }

  return resolvedPath;
};
