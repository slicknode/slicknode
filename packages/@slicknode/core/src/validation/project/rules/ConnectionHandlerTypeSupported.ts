/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import {
  ConnectionConfig,
  isObjectTypeConfig,
  TypeConfig,
} from '../../../definition';

import { TypeKind } from '../../../definition';

import { HANDLER_POSTGRES } from '../../../schema/handler';

import { PackageError } from '../../../errors';

/**
 * Ensures that the handler of the edge type is supported for connections
 *
 * @param context
 * @constructor
 */
function ConnectionHandlerTypeSupported(
  context: ValidationContext
): ValidationRuleConfig {
  return {
    connection: (connectionConfig: ConnectionConfig) => {
      const errorPrefix = `Relation error on field ${connectionConfig.source.typeName}.${connectionConfig.name}:`;

      let edgeType: TypeConfig;
      // We have an edgeType
      if (connectionConfig.edge.typeName) {
        edgeType = context.typeMap[connectionConfig.edge.typeName];
      } else {
        // Connection is defined via inline field on node
        edgeType = context.typeMap[connectionConfig.node.typeName];
      }

      // Check if handler on edge type is supported
      if (
        !edgeType ||
        !isObjectTypeConfig(edgeType) ||
        (isObjectTypeConfig(edgeType) &&
          (!edgeType.handler || edgeType.handler.kind !== HANDLER_POSTGRES))
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The handler of the type "${
              connectionConfig.edge?.typeName || edgeType?.name
            }" is not supported as connection edge`
          )
        );
      }
    },
  };
}

export default ConnectionHandlerTypeSupported;
