import * as middlewares from './middlewares';

import { RequestHandler, Router } from 'express';
import { combineMiddlewares } from './helpers';
import { SlicknodeHandlerOptions } from './types';
import { GraphQLAPI } from './controller';
import { createAdminApi } from '@slicknode/project-admin-api';
import { imageHandler } from '@slicknode/image-transform';

/**
 * Creates an express RequestHandler for a Slicknode GraphQL API
 *
 * @param options
 * @returns
 */
export function createHandler(
  options: SlicknodeHandlerOptions
): RequestHandler {
  const router = Router();
  if (options.admin) {
    router.use('/_admin', createAdminApi(options.admin));
  } else {
    console.warn(
      'WARNING: Admin API configuration missing, Slicknode Console integration will not be available.'
    );
  }

  if (options.images) {
    router.use('/images', imageHandler(options.images));
  } else {
    console.info('INFO: Image handler not configured');
  }

  router.use('/', GraphQLAPI());

  return combineMiddlewares([
    middlewares.noCache,
    middlewares.cors({ origins: options.corsOrigins || ['*'] }),
    middlewares.cookieParser,
    middlewares.i18n,
    middlewares.upload,
    middlewares.contextMiddleware(options),
    router,
  ]);
}
