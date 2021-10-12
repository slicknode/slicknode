import * as url from 'url';

/**
 * Helper function to allow import of ESM modules in commonJS code, that prevents typescript
 * from compiling await import('package') to require() calls.
 *
 * @param module
 * @returns
 */
export function importDynamic<T = any>(module: string): Promise<T> {
  const modulePath = require.resolve(module);
  const fileUrl = url.pathToFileURL(modulePath);
  // console.log('Dynamic import', modulePath, fileUrl);
  return _dynamicImport(fileUrl);
}

const _dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)'
) as (modulePath: URL) => Promise<any>;
