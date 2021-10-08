/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */

import CoreModule from '../../../modules/core';
import RelayModule from '../../../modules/relay';
import AuthModule from '../../../modules/auth';
import ImageModule from '../../../modules/image';

import { TypeKind, ModuleKind, ModuleConfig } from '../../../definition';

import { GraphQLString } from 'graphql';
import { Role } from '../../../auth';

const CORE_APPS = [CoreModule, RelayModule, AuthModule, ImageModule];

export const objectTypeModules: ModuleConfig[] = [
  {
    id: '@private/test-app',
    version: '0.0.1',
    kind: ModuleKind.DYNAMIC,
    types: [
      {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          stringField: {
            typeName: 'String',
            description: 'Field description',
            validators: [
              {
                type: 'regex',
                config: {
                  pattern: '/^(a-z)$/i',
                },
              },
            ],
          },
          requiredStringField: {
            typeName: 'String',
            required: true,
          },
          intField: { typeName: 'Int' },
          floatField: { typeName: 'Float' },
          booleanField: { typeName: 'Boolean' },
          idField: { typeName: 'ID' },
          listField: {
            typeName: 'String',
            list: true,
            arguments: {
              query: {
                typeName: 'String',
                defaultValue: 'query',
              },
            },
          },
          requiredListField: {
            typeName: 'String',
            required: true,
            unique: true,
            list: true,
          },
        },
        permissions: [
          {
            role: Role.ADMIN,
            query: `query {
          node(filter: {booleanField: true})
        }`,
          },
        ],
      },
    ],
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
  ...CORE_APPS,
];
