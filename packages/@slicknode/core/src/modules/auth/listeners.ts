/**
 * Created by Ivo Meißner on 15.08.18
 *
 */
import { RFDefinitionKind, RFDefinition } from '../../definition';

import { PreMutationHook } from '../../definition';

const encryptPassword: PreMutationHook = {
  kind: RFDefinitionKind.PRE_MUTATION,
  mutationName: 'createUser',
  handler: 'encryptPassword',
  returnsInputData: true,
  priority: Infinity,
};

const listeners: Array<RFDefinition> = [
  encryptPassword,
  {
    ...encryptPassword,
    mutationName: 'updateUser',
  },
];
export default listeners;
