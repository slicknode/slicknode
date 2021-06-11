import fs from 'fs';
import path from 'path';

/**
 * Throws an error if the provided value is not a valid directory
 * @param value
 */
export function directory(value: string) {
  const resolvedPath = path.resolve(value);
  const stats = fs.lstatSync(resolvedPath);
  if (!stats || !stats.isDirectory()) {
    throw new Error('Value is not a valid directory');
  }

  return resolvedPath;
}
