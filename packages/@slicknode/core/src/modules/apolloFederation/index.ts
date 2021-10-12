/**
 * Created by Ivo Meißner on 18.11.16.
 *
 */
import { ModuleConfig, TypeConfig } from '../../definition';
import types from './types/index';
import admin from './admin';
import typeExtensions from './typeExtensions';
import directives from './directives';

import { ModuleKind, TypeKind } from '../../definition';

/**
 * Configuration for relay app
 * @type {{namespace: null, label: string, types: *[]}}
 */
const apolloFederationModuleConfig: ModuleConfig = {
  id: 'apollo-federation',
  version: '0.0.1',
  kind: ModuleKind.NATIVE,
  admin,
  types,
  typeExtensions,
  directives,
  enhanceModule(
    moduleConfig: ModuleConfig,
    moduleConfigs: Array<ModuleConfig>
  ): ModuleConfig {
    return {
      ...moduleConfig,
      types: [
        ...(moduleConfig.types || []),

        // Add union type for _Entity with all types that implement Node interface
        {
          kind: TypeKind.UNION,
          name: '_Entity',
          description:
            'A union type of all entities that can be loaded via apollo federated service',
          typeNames: moduleConfigs.reduce(
            (typeNames: Array<string>, config: ModuleConfig) => {
              (config.types || []).forEach((type: TypeConfig) => {
                if (
                  type.kind === TypeKind.OBJECT &&
                  (type.interfaces || []).includes('Node') &&
                  type.expose !== false
                ) {
                  typeNames.push(type.name);
                }
              });
              return typeNames;
            },
            []
          ),
        },
      ],
    };
  },
};

export default apolloFederationModuleConfig;
