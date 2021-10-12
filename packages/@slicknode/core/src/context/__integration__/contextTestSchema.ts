/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */
import { baseModules } from '../../modules';
import uuid from 'uuid';
import { TypeKind, ModuleKind, ModuleConfig } from '../../definition';
import Node from '../../modules/relay/types/Node';
import { HANDLER_POSTGRES } from '../../schema/handler';

const modules: ModuleConfig[] = [
  ...baseModules,
  {
    id: '@private/contest-test-schema',
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [
      {
        handler: {
          kind: HANDLER_POSTGRES,
        },
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          ...Node.fields,
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
    settings: {
      name: 'Settings',
      kind: TypeKind.INPUT_OBJECT,
      fields: {
        string: {
          typeName: 'String',
          required: false,
          description: 'Some description',
        },
        intRequired: {
          typeName: 'Int',
          required: true,
        },
      },
    },
  },
];

export default modules;
