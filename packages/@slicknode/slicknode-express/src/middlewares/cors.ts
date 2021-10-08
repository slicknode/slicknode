import corsMiddleware from 'cors';
import { RequestHandler } from 'express';

export const cors = ({ origins }: { origins: string[] }): RequestHandler =>
  corsMiddleware({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || origins.indexOf(origin) !== -1 || origins.includes('*')) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin ${origin} not allowed by CORS configuration`)
      );
    },
  });
