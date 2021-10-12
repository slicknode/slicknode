/**
 * Created by Ivo Meißner on 2019-06-08
 *
 */
import { ObjectTypeConfig } from '../../../definition';
import { TypeKind } from '../../../definition';

const _Service: ObjectTypeConfig = {
  kind: TypeKind.OBJECT,
  name: '_Service',
  description: 'The apollo federation service definition',
  fields: {
    sdl: {
      typeName: 'String',
      required: true,
      description:
        'The SDL representing the apollo federated service capabilities',
    },
  },
};

export default _Service;
