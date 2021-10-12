import { expect } from 'chai';
import { Role } from '../../../auth';
import { ModuleConfig, ModuleKind, TypeKind } from '../../../definition';
import { baseModules } from '../../../modules';
import { upgradeModuleConfigs } from '../upgradeModuleConfigs';

describe('upgradeModuleConfigs', () => {
  it('renames relatedFields to typeExtensions', () => {
    const configs = [
      {
        id: 'somemodule',
        label: 'Hey',
        relatedFields: {
          Query: {
            hello: {
              typeName: 'String',
            },
          },
        },
      },
    ];

    const result = upgradeModuleConfigs(configs);
    expect(result[0].typeExtensions.Query.hello.typeName).to.equal('String');
    expect(result[0].hasOwnProperty('relatedFields')).to.be.false;
  });

  it('does not mutate config for no changes', () => {
    const configs = baseModules;
    const result = upgradeModuleConfigs(configs);
    for (let i: number; i < configs.length; i++) {
      expect(configs[i]).to.equal(result[i]);
    }
  });

  it('adds publish permissions to old content nodes', () => {
    const configs: ModuleConfig[] = [
      {
        id: 'somemodule',
        admin: {
          base: {
            mutations: {},
            name: 'Hey',
            pages: [],
            types: {},
          },
        },
        version: 'latest',
        kind: ModuleKind.DYNAMIC,
        types: [
          {
            kind: TypeKind.OBJECT,
            name: 'Test',
            fields: {
              id: {
                typeName: 'ID',
              },
            },
            interfaces: ['Node', 'Content'],
            permissions: [{ role: Role.ANONYMOUS }],
            mutations: {
              create: [{ role: Role.ADMIN }],
              delete: [{ role: Role.STAFF }],
            },
          },
        ],
      },
    ];

    const result = upgradeModuleConfigs(configs) as any;
    expect(result[0].types[0].mutations.publish).to.deep.equal([
      { role: Role.ADMIN },
    ]);
    expect(result[0].types[0].mutations.unpublish).to.deep.equal([
      { role: Role.STAFF },
    ]);
  });

  it('does not overwrite publish permissions', () => {
    const configs: ModuleConfig[] = [
      {
        id: 'somemodule',
        admin: {
          base: {
            mutations: {},
            name: 'Hey',
            pages: [],
            types: {},
          },
        },
        version: 'latest',
        kind: ModuleKind.DYNAMIC,
        types: [
          {
            kind: TypeKind.OBJECT,
            name: 'Test',
            fields: {
              id: {
                typeName: 'ID',
              },
            },
            interfaces: ['Node', 'Content'],
            permissions: [{ role: Role.ANONYMOUS }],
            mutations: {
              create: [{ role: Role.ADMIN }],
              delete: [{ role: Role.STAFF }],
              publish: [{ role: Role.ANONYMOUS }],
              unpublish: [{ role: Role.AUTHENTICATED }],
            },
          },
        ],
      },
    ];

    const result = upgradeModuleConfigs(configs) as any;
    expect(result[0].types[0].mutations.publish).to.deep.equal([
      { role: Role.ANONYMOUS },
    ]);
    expect(result[0].types[0].mutations.unpublish).to.deep.equal([
      { role: Role.AUTHENTICATED },
    ]);
  });
});
