import { RequestHandler, Router, json } from 'express';
import { AuthController } from './controllers/auth';
import { ConfigController } from './controllers/config';
import { errorHandler } from './controllers/error';
import { authMiddleware, contextMiddleware } from './middlewares';
import { AdminApiOptions } from './types';

export const createAdminApi = (options: AdminApiOptions): RequestHandler => {
  const router = Router();

  // Add middlewares
  router.use(contextMiddleware());
  router.use(json());

  // Setup routes
  router.post('/authenticate', AuthController.authenticate(options));
  router.get(
    '/config/permissions/:type',
    authMiddleware(),
    ConfigController.permissions(options)
  );
  router.get('/config', authMiddleware(), ConfigController.get());

  // Add error handling
  router.use(errorHandler());

  return router;
};
