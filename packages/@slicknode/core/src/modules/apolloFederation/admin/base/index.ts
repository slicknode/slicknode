/**
 * Created by Ivo Meißner on 23.04.17.
 *
 */

import { ModuleAdminConfig } from '../../../../definition';
import pages from './pages';
import types from './types';

const config: ModuleAdminConfig = {
  name: 'Apollo Federation',
  description: 'Module for a Apollo Federation',
  pages,
  types,
  mutations: {},
};

export default config;
