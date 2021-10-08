import { dirname } from 'path';
import { fileURLToPath, URL } from 'url';

export function dir(url: string | URL): string {
  return dirname(fileURLToPath(url));
}
