/**
 * Created by Ivo Meißner on 06.07.17.
 *
 */
import { Request } from 'express';
import _ from 'lodash';

/**
 * Returns the project alias of the given request
 * Returns NULL if it is the root project
 *
 * @param req
 * @param endpoint The full endpoint with {alias} placeholder
 */
export default function getProjectAlias(
  req: Request,
  endpoint: string
): string | undefined | null {
  const fullUrl =
    '//' +
    _.trim(req.headers.host + req.originalUrl.split('?')[0], '/').replace(
      /(:\d+)$/,
      ''
    );

  const parts = _.trim(endpoint, '/')
    .substring(endpoint.indexOf('//')) // Ignore protocol
    .replace(/(:\d+)$/, '') // Ignore port
    .split('{alias}');
  if (parts.length !== 2) {
    throw new Error(
      'Invalid PROJECT_URL in environment config. Has to contain 1 {alias} placeholder'
    );
  }
  if (!fullUrl.endsWith(parts[1])) {
    throw new Error(
      `Invalid URL for project endpoint. Expected ${fullUrl} to end with ${parts[1]}`
    );
  }

  return fullUrl.substring(parts[0].length, fullUrl.length - parts[1].length);
}
