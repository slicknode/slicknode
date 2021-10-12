/**
 * Created by Ivo Meißner on 13.02.17.
 *
 */
import { TypeKind, ModuleKind, ModuleConfig } from '../../definition';
import * as uuid from 'uuid';

const modules: ModuleConfig[] = [
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
          stringField: {
            typeName: 'String',
          },
          relatedField: {
            typeName: 'RelatedType',
          },
          requiredTypeExtension: {
            typeName: 'RelatedType',
            required: true,
          },
          relatedListField: {
            list: true,
            typeName: 'RelatedType',
          },
        },
      },
      {
        kind: TypeKind.OBJECT,
        name: 'RelatedType',
        description: 'ReferencedTypeDescription',
        fields: {
          email: {
            typeName: 'String',
            validators: [
              {
                type: 'email',
              },
            ],
          },
          emailList: {
            typeName: 'String',
            list: true,
            validators: [
              {
                type: 'email',
              },
            ],
          },
          requiredEmail: {
            typeName: 'String',
            required: true,
            validators: [
              {
                type: 'email',
              },
            ],
          },
          requiredEmailList: {
            typeName: 'String',
            required: true,
            list: true,
            validators: [
              {
                type: 'email',
              },
            ],
          },
          parent: {
            typeName: 'RelatedType',
          },
        },
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
];
export default modules;
