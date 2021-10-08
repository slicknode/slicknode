/**
 * Created by Ivo Meißner on 06.12.16.
 *
 */

import PostgresHandler from './postgres/index';

import Dataloader from 'dataloader';

import { Handler, HANDLER_POSTGRES } from './base';

export { HANDLER_POSTGRES } from './base';

export { default as createDbProxy } from './createDbProxy';

export { DbProxy } from './createDbProxy';

import { ObjectTypeConfig, HandlerConfig } from '../../definition';

import Context from '../../context';

/**
 * Returns the handler for the given type
 * @deprecated Use context.db.TypeName instead
 * @param config
 * @returns {Handler}
 */
export function getHandler(
  config: HandlerConfig | undefined | null
): typeof Handler {
  if (config && config.kind === HANDLER_POSTGRES) {
    return PostgresHandler;
  }

  throw new Error('No handler found for type ' + String(config));
}

/**
 * Returns true if the handler supports list of root query type
 * @param handler
 */
export function handlerSupportsList(handler: HandlerConfig): boolean {
  return handler.kind === HANDLER_POSTGRES;
}
