/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { RFDefinitionKind } from './RFDefinitionKind';

/**
 * listener function definition for pre mutation hooks. An execution failure of a
 * pre mutation listener function call results in the mutation not being executed and
 * returning an error.
 */
export type PreMutationHook = {
  /**
   * Kind of the RF definition
   */
  kind: RFDefinitionKind.PRE_MUTATION; // Same as RFDefinitionKind.PRE_MUTATION,
  /**
   * The mutation name that triggers the listener function
   */
  mutationName: string;
  /**
   * If set to true, the result data of the listener function is used as input for the next
   * function in the chain (or the mutation)
   * Functions with returnsInputData are processed serially. The other functions are processed in parallel.
   */
  returnsInputData?: boolean;
  /**
   * The priority of the listener
   */
  priority?: number;
  /**
   * If true, a custom error message is passed
   */
  returnsErrorMessage?: boolean;
  /**
   * The name of the handler in the module
   */
  handler: string;
};
