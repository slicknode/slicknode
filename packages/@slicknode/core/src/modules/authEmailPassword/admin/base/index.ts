/**
 * Created by Ivo Meißner on 23.04.17.
 *
 */

import { ModuleAdminConfig } from '../../../../definition';
import pages from './pages';
import types from './types';

const config: ModuleAdminConfig = {
  name: 'Email password auth',
  description: 'Authentication via email address and password',
  pages,
  types,
  mutations: {},
};

export default config;
