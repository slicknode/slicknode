/**
 * Created by Ivo Meißner on 30.12.18
 *
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  RuntimeInterface,
  ExecutionContext,
  ExecutionResult,
  ExecutionPayload,
} from '../../types';

type UnconfiguredRuntimeOptions = Record<string, unknown>;

export default class UnconfiguredRuntime implements RuntimeInterface {
  options: UnconfiguredRuntimeOptions;

  constructor(options?: UnconfiguredRuntimeOptions) {
    this.options = options || {};
  }

  /* eslint-disable no-unused-vars */
  /**
   * Executes the function
   *
   * @param handler The handler that is invoked inside the package. Something like build/resolvers/Query/getMyData
   * Works like require(<handler>)(payload, context);
   * @param payload
   * @param context
   * @param deployment
   */
  async execute(
    _handler: string,
    _payload: ExecutionPayload,
    _context: ExecutionContext
  ): Promise<ExecutionResult> {
    return {
      data: null,
      success: false,
      logs: null,
      message:
        'Runtime is not configured. Add the URL to your custom runtime endpoint in the project settings.',
      charges: [],
    };
  }
}
