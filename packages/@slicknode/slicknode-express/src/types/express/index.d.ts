import 'express';
import { Context } from '@slicknode/core';

declare global {
  namespace Express {
    interface Request {
      context?: Context;
    }
  }
}
