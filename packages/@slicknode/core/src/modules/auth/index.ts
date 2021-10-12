/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */
import { ModuleConfig } from '../../definition';

import { ModuleKind } from '../../definition';

import mutations from './mutations/index';
import types from './types/index';
import typeExtensions from './typeExtensions';
import admin from './admin';
import connections from './conections';
import functions from './functions';
import listeners from './listeners';

const authModule: ModuleConfig = {
  id: 'auth',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  admin,
  mutations,
  types,
  typeExtensions,
  listeners,
  connections,
  functions,
};

export default authModule;
