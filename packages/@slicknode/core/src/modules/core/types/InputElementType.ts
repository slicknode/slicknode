/**
 * Created by Ivo Meißner on 27.12.17.
 *
 */

import { GraphQLEnumType } from 'graphql';
import { InputElementType } from '../../../definition/InputElementType';

const type = new GraphQLEnumType({
  name: 'InputElementType',
  description: 'The input element types',
  values: {
    [InputElementType.TEXT]: { value: InputElementType.TEXT },
    [InputElementType.TEXTAREA]: { value: InputElementType.TEXTAREA },
    [InputElementType.MARKDOWN]: { value: InputElementType.MARKDOWN },
    [InputElementType.PASSWORD]: { value: InputElementType.PASSWORD },
  },
});

import { EnumTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';

const InputElementTypeConfig: EnumTypeConfig = {
  kind: TypeKind.ENUM,
  name: 'InputElementType',
  description: 'The admin input element type',
  type,
  values: {},
};

export default InputElementTypeConfig;
