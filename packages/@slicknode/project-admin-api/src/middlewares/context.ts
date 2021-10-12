import { RequestHandler } from 'express';

export const contextMiddleware = (): RequestHandler => (req, res, next) => {
  if (!req.context) {
    next(
      new Error(
        'Slicknode context was not found in request. Add context middleware before admin API'
      )
    );
  } else {
    next();
  }
};
