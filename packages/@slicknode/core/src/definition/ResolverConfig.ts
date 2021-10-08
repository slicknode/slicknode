/**
 * Created by Ivo Meißner on 05.07.18
 *
 */

export type ResolverConfig = {
  // The name of the handler in the module with the resolver logic
  handler: string;
};

/**
 * A map of custom resolvers for types and fields
 */
export type ResolverConfigMap = {
  [typeName: string]: {
    [fieldName: string]: ResolverConfig;
  };
};
