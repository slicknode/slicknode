/**
 * Created by Ivo Meißner on 05.10.18
 *
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { TypeConfigMap, InputObjectTypeConfig } from '../../definition';
import { builtInTypes } from '../builder';

import {
  typeConfigToFilterType,
  typeConfigToOrderFieldsType,
} from '../connectionBuilder';
import { getTypeFilterName } from '../identifiers';
import { EnumTypeConfig, ObjectTypeConfig } from '../../definition';
import { TypeKind } from '../../definition/TypeKind';
import _ from 'lodash';

describe('connectionBuilder', () => {
  const builtInTypesMap: TypeConfigMap = _.mapValues(
    builtInTypes,
    (type, name) => ({
      name,
      type,
      kind: TypeKind.SCALAR,
    })
  ) as TypeConfigMap;
  describe('typeConfigToFilterType', () => {
    it('creates filter type successfully', () => {
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          test: {
            typeName: 'String',
          },
        },
        interfaces: ['Node'],
      };
      const typeMap: TypeConfigMap = {
        ...builtInTypesMap,
        [typeConfig.name]: typeConfig,
      };
      const connectionMap = {};

      const filterType = typeConfigToFilterType(
        typeConfig,
        typeMap,
        connectionMap
      );

      expect(filterType).to.deep.equal({
        kind: TypeKind.INPUT_OBJECT,
        name: getTypeFilterName(typeConfig.name),
        description: `The filter for objects of type ${typeConfig.name}`,
        fields: {
          AND: {
            description:
              'Return nodes that match all of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          OR: {
            description:
              'Return nodes that match at least one of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          test: {
            typeName: 'StringFilter',
            description: undefined,
            required: false,
          },
          id: {
            typeName: 'IDFilter',
            description: undefined,
            required: false,
          },
        },
      });
    });

    it('ignores fields with non node object types', () => {
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          test: {
            typeName: 'String',
          },
          objectField: {
            typeName: 'FieldType',
          },
        },
        interfaces: ['Node'],
      };
      const fieldTypeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'FieldType',
        description: 'TestDescription',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          test: {
            typeName: 'String',
          },
        },
      };
      const typeMap: TypeConfigMap = {
        ...builtInTypesMap,
        [typeConfig.name]: typeConfig,
        [fieldTypeConfig.name]: fieldTypeConfig,
      };
      const connectionMap = {};

      const filterType = typeConfigToFilterType(
        typeConfig,
        typeMap,
        connectionMap
      );

      expect(filterType).to.deep.equal({
        kind: TypeKind.INPUT_OBJECT,
        name: getTypeFilterName(typeConfig.name),
        description: `The filter for objects of type ${typeConfig.name}`,
        fields: {
          AND: {
            description:
              'Return nodes that match all of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          OR: {
            description:
              'Return nodes that match at least one of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          test: {
            typeName: 'StringFilter',
            description: undefined,
            required: false,
          },
          id: {
            typeName: 'IDFilter',
            description: undefined,
            required: false,
          },
        },
      });
    });

    it('ignores fields with no read access', () => {
      const typeConfig: ObjectTypeConfig = {
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          id: {
            typeName: 'ID',
            required: true,
          },
          test: {
            typeName: 'String',
          },
          writeOnly: {
            typeName: 'Int',
            access: [],
          },
        },
        interfaces: ['Node'],
      };
      const typeMap = {
        ...builtInTypesMap,
        [typeConfig.name]: typeConfig,
      };
      const connectionMap = {};

      const filterType: InputObjectTypeConfig = typeConfigToFilterType(
        typeConfig,
        typeMap,
        connectionMap
      );

      expect(filterType).to.deep.equal({
        kind: TypeKind.INPUT_OBJECT,
        name: getTypeFilterName(typeConfig.name),
        description: `The filter for objects of type ${typeConfig.name}`,
        fields: {
          AND: {
            description:
              'Return nodes that match all of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          OR: {
            description:
              'Return nodes that match at least one of the provided conditions',
            list: [true],
            required: false,
            typeName: '_TestTypeFilter',
          },
          test: {
            typeName: 'StringFilter',
            description: undefined,
            required: false,
          },
          id: {
            typeName: 'IDFilter',
            description: undefined,
            required: false,
          },
        },
      });
    });
  });

  describe('typeConfigToOrderFieldsType', () => {
    it('creates order fields type successfully', () => {
      const orderFieldsType: EnumTypeConfig = typeConfigToOrderFieldsType({
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          test: {
            typeName: 'String',
          },
          writeOnly: {
            typeName: 'Int',
            access: [],
          },
        },
      });

      expect(orderFieldsType).to.deep.equal({
        description:
          'All fields that can be used for sorting the nodes of type TestType',
        kind: TypeKind.ENUM,
        name: '_TestTypeSortableField',
        values: {
          test: {
            description: undefined,
            value: 'test',
          },
        },
      });
    });

    it('ignores fields without read access', () => {
      const orderFieldsType: EnumTypeConfig = typeConfigToOrderFieldsType({
        kind: TypeKind.OBJECT,
        name: 'TestType',
        description: 'TestDescription',
        fields: {
          test: {
            typeName: 'String',
          },
          writeOnly: {
            typeName: 'Int',
            access: [],
          },
        },
      });

      expect(orderFieldsType).to.deep.equal({
        description:
          'All fields that can be used for sorting the nodes of type TestType',
        kind: TypeKind.ENUM,
        name: '_TestTypeSortableField',
        values: {
          test: {
            description: undefined,
            value: 'test',
          },
        },
      });
    });
  });
});
