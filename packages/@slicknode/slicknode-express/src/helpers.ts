import { RequestHandler } from 'express';
import { MaybeThunk } from './types';

/**
 * Enables the use of async request handlers in express
 * @param fn
 */
export const asyncMiddleware =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * Combine multiple express middlewares into a single function
 */
export function combineMiddlewares(
  middlewares: RequestHandler[]
): RequestHandler {
  return middlewares.reduce(function (a, b) {
    return function (req, res, next) {
      a(req, res, (err: any) => {
        if (err) {
          return next(err);
        }
        b(req, res, next);
      });
    };
  });
}

/**
 * Resolves the thunk
 * @param data
 * @returns
 */
export async function resolveThunk<T>(data: MaybeThunk<T>): Promise<T> {
  if (isFunction(data)) {
    return await data();
  } else {
    return data;
  }
}

/**
 * Returns true if given type is a function
 * @param type
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/ban-types
function isFunction(type: any): type is Function {
  return typeof type === 'function';
}
