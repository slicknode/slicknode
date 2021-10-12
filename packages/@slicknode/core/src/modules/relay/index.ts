/**
 * Created by Ivo Meißner on 18.11.16.
 *
 */

import { ModuleConfig } from '../../definition';
import types from './types/index';
import admin from './admin';

import { ModuleKind } from '../../definition';
import { typeExtensions } from './typeExtensions';

/**
 * Configuration for relay app
 * @type {{namespace: null, label: string, types: *[]}}
 */
const relayModuleConfig: ModuleConfig = {
  id: 'relay',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  types,
  typeExtensions,
  admin,
};

export default relayModuleConfig;
