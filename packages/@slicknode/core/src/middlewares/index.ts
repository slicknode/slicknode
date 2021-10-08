/**
 * Created by Ivo Meißner on 21.06.17.
 *
 */
import cookieParser from 'cookie-parser';
import i18n from 'i18n';
import path from 'path';
import { CORS_ORIGINS } from '../config';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { RequestHandler } from 'express';

i18n.configure({
  // setup some locales - other locales default to en silently
  locales: ['en'],

  // sets a custom cookie name to parse locale settings from
  cookie: 'locale',

  // where to store json files
  directory: path.resolve(__dirname, '../locales'),

  // Enable object notation for locale files
  objectNotation: true,

  // Automatically update files only in dev
  updateFiles: process.env.NODE_ENV !== 'production',
});

// @FIXME: Add possible domains
const corsOptions = {
  credentials: true,
  maxAge: 86400, // 1 day
  origin: (origin, callback) => {
    if (
      !origin ||
      CORS_ORIGINS.indexOf(origin) !== -1 ||
      CORS_ORIGINS.includes('*')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
};

// Set Cache headers
function noCache(req, res, next) {
  if (req.method === 'OPTIONS') {
    // Cache options request
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    // No cache for all other requests
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}

function redirectHttps(req, res, next) {
  // If we are in prod environment, redirect if insecure request
  if (
    req.get('x-forwarded-proto') === 'http' &&
    (req.get('via') || '').toLowerCase().includes('google')
  ) {
    return res.redirect('https://' + req.headers.host + req.url);
  }

  next();
}

// Multi part handling for image upload
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 5,
    parts: 100,
  },
});

const middlewares: RequestHandler[] = [
  cors(corsOptions),
  helmet(),
  cookieParser(),
  i18n.init as RequestHandler,
  redirectHttps,
  upload.any(),
  noCache,
  // graphQLErrorMiddleware
];

export default middlewares;
