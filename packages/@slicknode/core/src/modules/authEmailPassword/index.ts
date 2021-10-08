/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */
import { ModuleConfig } from '../../definition';

import { ModuleKind } from '../../definition';

import mutations from './mutations/index';
import types from './types/index';
import admin from './admin';

const authEmailPasswordModule: ModuleConfig = {
  id: 'auth-email-password',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  mutations,
  types,
  admin,
};

export default authEmailPasswordModule;
