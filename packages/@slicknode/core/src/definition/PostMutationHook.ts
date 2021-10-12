/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */
import { RFDefinitionKind } from './RFDefinitionKind';

export type PostMutationHook = {
  /**
   * Kind of the RF definition
   */
  kind: RFDefinitionKind.POST_MUTATION; // Same as RFDefinitionKind.POST_MUTATION,
  /**
   * The mutation name that triggers the listener function
   */
  mutationName: string;
  /**
   * The GraphQL query to query the data to be sent to the listener function
   */
  query: string | undefined | null;
  /**
   * The name of the handler as registered in the app
   */
  handler: string;
};
