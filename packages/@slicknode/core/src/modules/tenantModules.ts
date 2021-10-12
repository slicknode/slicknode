import { ModuleConfig } from '../definition';

import AuthEmailPasswordModule from './authEmailPassword';
import ApolloFederationModule from './apolloFederation';
import { baseModules } from './baseModules';

/**
 * Modules that are installed on each tenant
 * @type {[*]}
 */
export const tenantModules: Array<ModuleConfig> = [
  ...baseModules,
  AuthEmailPasswordModule,
  ApolloFederationModule,
];
