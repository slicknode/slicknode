import { expect } from 'chai';
import { baseModules } from '../../modules';
import {
  fromJSONToProjectConfig,
  fromProjectConfigToJSON,
} from '../projectLoader';
import { ModuleConfig, ModuleKind } from '../../definition';

describe('projectLoader', () => {
  it('converts legacy ModuleConfig.relatedFields to typeExtensions', async () => {
    const secretKey = '1234567890123456xyz';
    const modules: ModuleConfig[] = [
      ...baseModules,
      {
        id: '@private/sometest',
        kind: ModuleKind.DYNAMIC,
        version: '0.0.1',
        admin: {
          base: {
            mutations: {},
            name: 'sometest',
            pages: [],
            types: {},
          },
        },
        typeExtensions: {
          Query: {
            hello: {
              typeName: 'String',
            },
          },
        },
      },
    ];

    // Create legacy format config
    const configJson = fromProjectConfigToJSON(
      {
        modules,
        moduleSettings: {},
      },
      secretKey
    );
    expect(configJson).to.not.include('relatedFields');
    const packgedConfig = JSON.parse(configJson);
    packgedConfig.modules.find((module) => {
      if (module.id === '@private/sometest') {
        module.relatedFields = module.typeExtensions;
        delete module.typeExtensions;
      }
    });
    const legacyJson = JSON.stringify(packgedConfig);
    expect(legacyJson).to.include('relatedFields');
    const restoredConfig = await fromJSONToProjectConfig(legacyJson, secretKey);
    const foundModule = restoredConfig.modules.find(
      (module) => module.id === '@private/sometest'
    );
    expect(foundModule.typeExtensions.Query.hello.typeName).to.equal('String');
  });
});
