/**
 * Created by Ivo Meißner on 02.09.17.
 */

/**
 * Copies the object recursively and sorts all keys of objects and child objects
 * in alphabetical order
 *
 * @param obj
 * @param recursive
 */
export function sortKeys(obj: {[key: string]: any}, recursive: boolean = true): {[key: string]: any} {
  return Object.keys(obj).sort().reduce((sortedObject, key) => {
    if (typeof obj[key] === 'object' && recursive) {
      sortedObject[key] = sortKeys(obj[key]);
    } else {
      sortedObject[key] = obj[key];
    }

    return sortedObject;
  }, {} as {[key: string]: any});
}
