/* eslint-disable @typescript-eslint/no-unused-vars */
// import * as express from 'express';
import { Context } from '@slicknode/core';

declare global {
  namespace Express {
    interface Request {
      context?: Context;
    }
  }
}
