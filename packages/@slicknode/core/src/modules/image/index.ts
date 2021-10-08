/**
 * Created by Ivo Meißner on 17.06.17.
 *
 */

import { ModuleConfig } from '../../definition';

import { ModuleKind } from '../../definition';

import types from './types/index';
import admin from './admin';
import mutations from './mutations';
import typeExtensions from './typeExtensions';

const imageModule: ModuleConfig = {
  id: 'image',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  mutations,
  types,
  admin,
  typeExtensions,
};

export default imageModule;
