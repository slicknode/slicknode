import { ModuleConfig, ModuleKind } from '../../definition';

import mutations from './mutations';
import types from './types';
import admin from './admin';
import { enhanceModule } from './enhanceModule';
import { fixtures } from './fixtures';

const contentModule: ModuleConfig = {
  id: 'content',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  mutations,
  types,
  admin,
  enhanceModule,
  fixtures,
};

export default contentModule;
