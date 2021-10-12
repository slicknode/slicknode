/**
 * Created by Ivo Meißner on 12.10.17.
 *
 */

import { expect } from 'chai';
import * as uuid from 'uuid';
import { ModuleConfig, ModuleKind, TypeKind } from '../../definition';

import {
  getMutationPermissionMap,
  getObjectTypePermissionMap,
  getPersistedTypeExtensionMap,
} from '../utils';
import { Role } from '../../auth';

describe('Schema utils', () => {
  describe('getMutationPermissionMap', () => {
    it('adds permissions from a simple module', () => {
      const modules: ModuleConfig[] = [
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          types: [],
          typeExtensions: {},
          typePermissions: {
            Mutation: {
              permissions: [{ role: Role.ANONYMOUS, fields: ['someMutation'] }],
            },
          },
        },
      ];
      const result = getMutationPermissionMap(modules);
      expect(result).to.deep.equal({
        someMutation: [{ role: Role.ANONYMOUS }],
      });
    });

    it('adds multiple permissions from a simple module', () => {
      const result = getMutationPermissionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            Mutation: {
              permissions: [
                {
                  role: Role.ANONYMOUS,
                  fields: ['someMutation', 'otherMutation'],
                },
              ],
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        someMutation: [{ role: Role.ANONYMOUS }],
        otherMutation: [{ role: Role.ANONYMOUS }],
      });
    });

    it('merges permissions from multiple modules', () => {
      const result = getMutationPermissionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            Mutation: {
              permissions: [
                {
                  role: Role.ANONYMOUS,
                  fields: ['someMutation', 'otherMutation'],
                },
              ],
            },
          },
        },
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            Mutation: {
              permissions: [
                {
                  role: Role.ADMIN,
                  fields: ['someMutation', 'thirdMutation'],
                },
              ],
            },
          },
        },
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        someMutation: [{ role: Role.ANONYMOUS }, { role: Role.ADMIN }],
        otherMutation: [{ role: Role.ANONYMOUS }],
        thirdMutation: [{ role: Role.ADMIN }],
      });
    });
  });

  describe('getObjectTypePermissionMap', () => {
    it('adds permissions from a simple module', () => {
      const result = getObjectTypePermissionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            SomeType: {
              permissions: [{ role: Role.ANONYMOUS }],
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        SomeType: {
          permissions: [{ role: Role.ANONYMOUS }],
        },
      });
    });

    it('ignores modules without typePermissions', () => {
      const result = getObjectTypePermissionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            SomeType: {
              permissions: [{ role: Role.ANONYMOUS }],
            },
          },
        },
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        SomeType: {
          permissions: [{ role: Role.ANONYMOUS }],
        },
      });
    });

    it('merges permissions from multiple modules', () => {
      const result = getObjectTypePermissionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            SomeType: {
              permissions: [{ role: Role.ANONYMOUS }],
            },
          },
        },
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [],
          typeExtensions: {},
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
          typePermissions: {
            OtherType: {
              mutations: {
                delete: [{ role: Role.ANONYMOUS }],
              },
            },
            SomeType: {
              permissions: [{ role: Role.ADMIN }],
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        OtherType: {
          mutations: {
            delete: [{ role: Role.ANONYMOUS }],
          },
        },
        SomeType: {
          permissions: [{ role: Role.ANONYMOUS }, { role: Role.ADMIN }],
        },
      });
    });
  });

  describe('getPersistedtypeExtensionsMap', () => {
    it('returns related fields without resolver', () => {
      const result = getPersistedTypeExtensionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'TestDescription',
              fields: {
                test: {
                  typeName: 'String',
                },
              },
            },
          ],
          typeExtensions: {
            Viewer: {
              test: {
                typeName: 'TestType',
              },
            },
          },
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
        },
      ]);
      expect(result).to.deep.equal({
        Viewer: {
          test: {
            typeName: 'TestType',
          },
        },
      });
    });

    it('ignores fields with resolver', () => {
      const result = getPersistedTypeExtensionMap([
        {
          id: uuid.v1(),
          version: '0.0.1',
          kind: ModuleKind.DYNAMIC,
          types: [
            {
              kind: TypeKind.OBJECT,
              name: 'TestType',
              description: 'TestDescription',
              fields: {
                test: {
                  typeName: 'String',
                },
              },
            },
          ],
          typeExtensions: {
            Viewer: {
              test: {
                typeName: 'TestType',
                resolve: () => null,
              },
            },
          },
          admin: {
            base: {
              name: '',
              description: '',
              types: {},
              pages: [],
              mutations: {},
            },
          },
        },
      ]);
      expect(result).to.deep.equal({});
    });
  });
});
