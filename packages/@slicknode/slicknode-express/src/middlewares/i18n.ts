import path from 'path';
import i18nLib from 'i18n';
import { RequestHandler } from 'express';

/**
 * Configure i18n
 */
i18nLib.configure({
  // setup some locales - other locales default to en silently
  locales: ['en'],

  // sets a custom cookie name to parse locale settings from
  cookie: 'locale',

  // where to store json files
  directory: path.resolve(__dirname, './locales'),

  // Enable object notation for locale files
  objectNotation: true,

  // Automatically update files only in dev
  updateFiles: false,
});
export const i18n = i18nLib.init as RequestHandler;
