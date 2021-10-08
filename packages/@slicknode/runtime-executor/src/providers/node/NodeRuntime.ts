/**
 * Created by Ivo Meißner on 30.12.18
 */

import type { SlicknodeRuntime } from 'slicknode-runtime';
import * as url from 'url';

import {
  RuntimeInterface,
  ExecutionContext,
  ExecutionResult,
  ExecutionPayload,
} from '../../types';

export type NodeRuntimeOptions = {
  modules: Array<{ moduleId: string; modulePath: string }>;
  watch?: boolean;
};

export class NodeRuntime implements RuntimeInterface {
  private runtime: SlicknodeRuntime | undefined;
  private options: NodeRuntimeOptions;

  constructor(options: NodeRuntimeOptions) {
    this.options = options;
  }

  private async getRuntime(): Promise<SlicknodeRuntime> {
    if (!this.runtime) {
      const { SlicknodeRuntime } = await importDynamic('slicknode-runtime');
      const { modules, watch = false } = this.options;
      const runtime = new SlicknodeRuntime({
        watch,
      });

      // Register modules
      modules.forEach(({ moduleId, modulePath }) =>
        runtime.register(moduleId, modulePath)
      );

      this.runtime = runtime;
      return runtime;
    } else {
      return this.runtime;
    }
  }

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
    handler: string,
    payload: ExecutionPayload,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const data = {
      module: context.module.id,
      handler,
      payload,
      context,
    };
    const body = JSON.stringify(data);

    const runtime = await this.getRuntime();
    const response = await runtime.execute(body);
    return {
      data: response?.data || null,
      success:
        (response &&
          !response.error &&
          Object.prototype.hasOwnProperty.call(response, 'data')) ||
        false,
      message:
        (response && response.error && response.error.message) || // User defined message
        (!Object.prototype.hasOwnProperty.call(response, 'data') &&
          'Invalid runtime response: data property is missing') || // Invalid response shape
        null,
      logs: null,
      charges: [],
    };
  }
}

/**
 * Helper function to allow import of ESM modules in commonJS code, that prevents typescript
 * from compiling await import('package') to require() calls.
 * Can potentially be removed once moduleResolution node12 lands in TypeScript 4.5
 *
 * @param module
 * @returns
 */
export function importDynamic<T = any>(module: string): Promise<T> {
  const modulePath = require.resolve(module);
  const fileUrl = url.pathToFileURL(modulePath);
  // console.log('Dynamic import', modulePath, fileUrl);
  return _dynamicImport(fileUrl);
}

const _dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)'
) as (modulePath: URL) => Promise<any>;
