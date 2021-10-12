/**
 * Created by Ivo Meißner on 21.10.17.
 *
 */

import Context from '../context';
import { FunctionKind } from './FunctionKind';

/**
 * listener functions can be invoked during executions of mutations for example
 */
export type FunctionConfigHttp = {
  /**
   * Kind
   */
  kind: FunctionKind.HTTP;
  /**
   * The URL that is being called
   */
  url: string;
  /**
   * The request method being used for calling the URL
   */
  method: HttpMethod;
  /**
   * The parameters that are added to the request
   */
  params?: {
    [name: string]: string;
  };
  /**
   * HTTP headers that are added to the request
   */
  headers?: {
    [name: string]: string;
  };
};

export type FunctionConfigNative = {
  kind: FunctionKind.NATIVE;
  /**
   * The function that is executed
   */
  execute: FunctionHandler;
};

export type FunctionConfigRuntime = {
  kind: FunctionKind.RUNTIME;
  /**
   * The (nodejs) module that exports the handler
   */
  handler: string;
};

/**
 * Request methods for invokation of listener function
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type FunctionHandler = (payload: any, context: Context) => Promise<any>;

export type FunctionConfig =
  | FunctionConfigHttp
  | FunctionConfigNative
  | FunctionConfigRuntime;
export type FunctionConfigMap = {
  [name: string]: FunctionConfig;
};
