/**
 * Created by Ivo Meißner on 19.01.17.
 *
 */
import CoreModule from '../../../modules/core/index';
import uuid from 'uuid';
import { TypeKind, ModuleKind, ModuleConfig } from '../../../definition';

const modules: ModuleConfig[] = [
  CoreModule,
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
];

export default modules;
