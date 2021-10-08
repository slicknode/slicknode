/**
 * Created by Ivo Meißner on 23.09.17.
 *
 */

import { ValidationContext, ValidationRuleConfig } from '../validate';

import { ConnectionConfig, isObjectTypeConfig } from '../../../definition';

import { TypeKind } from '../../../definition';

import { PackageError } from '../../../errors';

/**
 * Ensures that the handler of the edge type is supported for connections
 *
 * @param context
 * @constructor
 */
function ConnectionNodeInterfaceImplemented(
  context: ValidationContext
): ValidationRuleConfig {
  return {
    connection: (connectionConfig: ConnectionConfig) => {
      const errorPrefix = `Relation error on field ${connectionConfig.source.typeName}.${connectionConfig.name}:`;

      const nodeType = context.typeMap[connectionConfig.node.typeName];
      if (
        !nodeType ||
        nodeType.kind !== TypeKind.OBJECT ||
        !((isObjectTypeConfig(nodeType) && nodeType.interfaces) || []).includes(
          'Node'
        )
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The target of a relation has to be a valid Node`
          )
        );
      }
    },
  };
}

export default ConnectionNodeInterfaceImplemented;
