/**
 * Created by Ivo Meißner on 30.03.17.
 *
 */

import { BaseHandlerConfig } from './HandlerConfig';

export type HandlerPostgresConfig = BaseHandlerConfig & {
  kind: 1; // Same as HANDLER_POSTGRES
};
