/**
 * Created by Ivo Meißner on 30.12.18
 *
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

import {
  RuntimeInterface,
  ExecutionContext,
  ExecutionResult,
  ExecutionPayload,
} from '../../types';

type HttpRuntimeOptions = {
  endpoint: string;
  secret: string;
};

export default class HttpRuntime implements RuntimeInterface {
  options: HttpRuntimeOptions;

  constructor(options: HttpRuntimeOptions) {
    this.options = options;
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
    return await new Promise((resolve, reject) => {
      const timestamp = Math.floor(Date.now() / 1000);
      const data = {
        module: context.module.id,
        handler,
        payload,
        context,
      };
      const body = JSON.stringify(data);
      const signedString = [timestamp, body].join('\n');

      const hmac = crypto.createHmac('sha256', this.options.secret);
      hmac.update(signedString);
      const signature = hmac.digest('hex');

      const Authorization = ['SN1-HMAC-SHA256', `Signature=${signature}`].join(
        ' '
      );

      fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization,
          'X-Slicknode-Timestamp': String(timestamp),
        },
        body: JSON.stringify(data),
      })
        .then(async (response) => {
          try {
            return await response.json();
          } catch (e: any) {
            throw new Error(`Error decoding runtime response: ${e.message}`);
          }
        })
        .then((response) => {
          return resolve({
            data:
              response && Object.prototype.hasOwnProperty.call(response, 'data')
                ? response.data
                : null,
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
          });
        })
        .catch(reject);
    });
  }
}
