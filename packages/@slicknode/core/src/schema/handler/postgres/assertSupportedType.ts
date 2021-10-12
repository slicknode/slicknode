/**
 * Created by Ivo Meißner on 02.06.17.
 *
 */

import { TypeConfig } from '../../../definition';

import { TypeKind } from '../../../definition';

import { HANDLER_POSTGRES } from '../base';

/**
 * Throws an exception if the type is not supported
 * @param typeConfig
 * @param message
 */
export default function assertSupportedType(
  typeConfig: TypeConfig,
  message: string
): void {
  if (typeConfig.kind === TypeKind.OBJECT) {
    if (!typeConfig.handler || typeConfig.handler.kind !== HANDLER_POSTGRES) {
      throw new Error(
        'Unsupported handler type on type ' + typeConfig.name + ': ' + message
      );
    }
  } else {
    throw new Error(
      'Unsupported handler type on type ' + typeConfig.name + ': ' + message
    );
  }
}
