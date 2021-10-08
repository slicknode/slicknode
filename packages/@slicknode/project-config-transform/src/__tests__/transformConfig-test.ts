import { expect } from 'chai';
import * as Core from '@slicknode/core';
import { transformConfig } from '../index';

describe('transformConfig', () => {
  it('transforms object type config successfully', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.OBJECT,
            fields: {
              string: {
                typeName: 'String',
              },
              listString: {
                typeName: 'String',
                list: true,
              },
              listStringRequired: {
                typeName: 'String',
                list: true,
                required: true,
              },
            },
            name: 'SomeModule_FirstType',
            interfaces: ['Node'],
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'OBJECT',
              name: 'SomeModule_FirstType',
              fields: {
                string: { typeName: 'String' },
                listString: { typeName: 'String', list: [false] },
                listStringRequired: {
                  typeName: 'String',
                  list: [true],
                  required: true,
                },
              },
              interfaces: ['Node'],
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'OBJECT',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  fields: {
                    string: { label: 'String' },
                    listString: { label: 'List String' },
                    listStringRequired: { label: 'List String Required' },
                  },
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms input object type config successfully', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.INPUT_OBJECT,
            fields: {
              string: {
                typeName: 'String',
                required: true,
                list: [true, false, true],
                resolve: () => null,
              },
            },
            name: 'SomeModule_FirstType',
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'INPUT_OBJECT',
              name: 'SomeModule_FirstType',
              fields: {
                string: {
                  typeName: 'String',
                  required: true,
                  list: [true, false, true],
                },
              },
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'INPUT_OBJECT',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  fields: { string: { label: 'String' } },
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms union type config successfully', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.UNION,
            name: 'SomeModule_FirstType',
            typeNames: ['Text', 'Image'],
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'UNION',
              name: 'SomeModule_FirstType',
              typeNames: ['Text', 'Image'],
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'UNION',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  typeNames: ['Text', 'Image'],
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms interface type config successfully', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.INTERFACE,
            fields: {
              string: {
                typeName: 'String',
              },
            },
            name: 'SomeModule_FirstType',
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'INTERFACE',
              name: 'SomeModule_FirstType',
              fields: { string: { typeName: 'String' } },
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'INTERFACE',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  fields: { string: { label: 'String' } },
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms enum type config successfully', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.ENUM,
            name: 'SomeModule_FirstType',
            values: {
              VAL1: {
                value: 'VAL1',
                description: 'Description',
              },
              VAL2: {
                value: 'VAL2',
                description: 'Description2',
                deprecationReason: 'Deprecated',
              },
            },
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'ENUM',
              name: 'SomeModule_FirstType',
              values: {
                VAL1: {
                  value: 'VAL1',
                  description: 'Description',
                },
                VAL2: {
                  value: 'VAL2',
                  description: 'Description2',
                  deprecationReason: 'Deprecated',
                },
              },
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'ENUM',
                  label: 'First Type',
                  values: [
                    {
                      value: 'VAL1',
                      label: 'Val1',
                      description: 'Description',
                    },
                    {
                      value: 'VAL2',
                      label: 'Val2',
                      description: 'Description2',
                    },
                  ],
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms enum type config with internal values', () => {
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.ENUM,
            name: 'SomeModule_FirstType',
            values: {
              VAL1: {
                value: 1,
                description: 'Description',
              },
              VAL2: {
                value: 2,
                description: 'Description2',
                deprecationReason: 'Deprecated',
              },
            },
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'ENUM',
              name: 'SomeModule_FirstType',
              values: {
                VAL1: {
                  value: 'VAL1',
                  description: 'Description',
                },
                VAL2: {
                  value: 'VAL2',
                  description: 'Description2',
                  deprecationReason: 'Deprecated',
                },
              },
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'ENUM',
                  label: 'First Type',
                  values: [
                    {
                      value: 'VAL1',
                      label: 'Val1',
                      description: 'Description',
                    },
                    {
                      value: 'VAL2',
                      label: 'Val2',
                      description: 'Description2',
                    },
                  ],
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('transforms scalar type config successfully', () => {
    const decimalType = Core.baseModules
      .find((module) => module.id === 'core')
      ?.types?.find((type) => type.name === 'Decimal');
    if (!decimalType) {
      throw new Error('Could not load Decimal type');
    }
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.SCALAR,
            name: 'SomeModule_FirstType',
            type: Core.assertScalarTypeConfig(decimalType).type,
          },
        ],
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'SCALAR',
              name: 'SomeModule_FirstType',
            },
          ],
          mutations: [],
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'SCALAR',
                  label: 'First Type',
                },
              },
              typeExtensions: {},
            },
          },
        },
      ],
    });
  });

  it('adds persisted typeExtension', () => {
    const decimalType = Core.baseModules
      .find((module) => module.id === 'core')
      ?.types?.find((type) => type.name === 'Decimal');
    if (!decimalType) {
      throw new Error('Could not load Decimal type');
    }
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.OBJECT,
            name: 'SomeModule_FirstType',
            fields: {
              id: {
                typeName: 'ID',
                required: true,
              },
            },
            interfaces: ['Node'],
          },
        ],
        typeExtensions: {
          SomeModule_FirstType: {
            textField: {
              typeName: 'String',
            },
          },
        },
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'OBJECT',
              name: 'SomeModule_FirstType',
              interfaces: ['Node'],
              fields: { id: { typeName: 'ID', required: true } },
            },
          ],
          mutations: [],
          typeExtensions: {
            SomeModule_FirstType: { textField: { typeName: 'String' } },
          },
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'OBJECT',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  fields: { id: { label: 'Id' } },
                },
              },
              typeExtensions: {
                SomeModule_FirstType: {
                  fields: { textField: { label: 'Text Field' } },
                },
              },
            },
          },
        },
      ],
    });
  });

  it('adds readOnly typeExtension', () => {
    const decimalType = Core.baseModules
      .find((module) => module.id === 'core')
      ?.types?.find((type) => type.name === 'Decimal');
    if (!decimalType) {
      throw new Error('Could not load Decimal type');
    }
    const modules: Core.ModuleConfig[] = [
      {
        id: '@private/some-module',
        kind: Core.ModuleKind.DYNAMIC,
        version: 'latest',
        types: [
          {
            kind: Core.TypeKind.OBJECT,
            name: 'SomeModule_FirstType',
            fields: {
              id: {
                typeName: 'ID',
                required: true,
              },
            },
            interfaces: ['Node'],
          },
        ],
        typeExtensions: {
          SomeModule_FirstType: {
            textField: {
              typeName: 'String',
              resolve: () => null,
            },
          },
        },
        admin: {
          base: {
            name: 'Some Module',
            description: 'Module description',
            mutations: {},
            pages: [],
            types: {},
          },
        },
      },
    ];
    const result = transformConfig({ modules, buildDefaultAdmin: true });

    expect(result).to.deep.equal({
      modules: [
        {
          id: '@private/some-module',
          kind: 'DYNAMIC',
          version: 'latest',
          types: [
            {
              kind: 'OBJECT',
              name: 'SomeModule_FirstType',
              interfaces: ['Node'],
              fields: { id: { typeName: 'ID', required: true } },
            },
          ],
          mutations: [],
          typeExtensions: {
            SomeModule_FirstType: {
              textField: {
                typeName: 'String',
                access: ['READ'],
              },
            },
          },
          admin: {
            base: {
              name: 'Some Module',
              description: 'Module description',
              mutations: {},
              pages: [],
              types: {
                SomeModule_FirstType: {
                  name: 'SomeModule_FirstType',
                  kind: 'OBJECT',
                  label: 'First Type',
                  labelPlural: 'First Types',
                  fields: { id: { label: 'Id' } },
                },
              },
              typeExtensions: {
                SomeModule_FirstType: {
                  fields: {
                    textField: { label: 'Text Field' },
                  },
                },
              },
            },
          },
        },
      ],
    });
  });
});
