/**
 * Created by Ivo Meißner on 15.08.18
 *
 */

import { FunctionConfigMap, FunctionKind } from '../../definition';
import _ from 'lodash';
import { hashPassword } from '../../auth/utils';

const functions: FunctionConfigMap = {
  encryptPassword: {
    kind: FunctionKind.NATIVE,
    async execute(payload: {
      [x: string]: any;
    }): Promise<{
      [x: string]: any;
    }> {
      const input = _.get(payload, 'args.input', {});
      if (input.password) {
        // Encrypt password
        input.password = await hashPassword(input.password);
      }

      return {
        args: {
          input,
        },
      };
    },
  },
};

export default functions;
