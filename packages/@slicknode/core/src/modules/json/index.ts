/**
 * Created by Ivo Meißner on 18.11.16.
 *
 */
import { ModuleConfig } from '../../definition';
import types from './types/index';
import admin from './admin';

import { ModuleKind } from '../../definition';

/**
 * Configuration for relay app
 * @type {{namespace: null, label: string, types: *[]}}
 */
const jsonModuleConfig: ModuleConfig = {
  id: 'json',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  types,
  admin,
};

export default jsonModuleConfig;
