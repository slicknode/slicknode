import { ErrorRequestHandler } from 'express';

export const errorHandler = (): ErrorRequestHandler => {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({
      message: err.message,
    });
  };
};
