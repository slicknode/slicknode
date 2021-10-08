/**
 * Created by Ivo Meißner on 18.11.16.
 *
 */
import { ModuleConfig } from '../../definition';
import types from './types/index';
import admin from './admin';
import directives from './directives';

import { ModuleKind } from '../../definition';

/**
 * Configuration for relay app
 * @type {{namespace: null, label: string, types: *[]}}
 */
const coreModuleConfig: ModuleConfig = {
  id: 'core',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  types,
  admin,
  directives,
};

export default coreModuleConfig;
