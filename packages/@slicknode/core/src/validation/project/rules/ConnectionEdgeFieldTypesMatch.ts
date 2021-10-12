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

import { PackageError } from '../../../errors';
import { DEFAULT_PRIMARY_KEY } from '../../../schema/handler/postgres/constants';

/**
 * Ensures that ObjectTypes implement Node interface
 * This could eventually be removed once all object types are supported
 *
 * @param context
 * @constructor
 */
function ConnectionEdgeFieldTypesMatch(
  context: ValidationContext
): ValidationRuleConfig {
  return {
    connection: (connectionConfig: ConnectionConfig) => {
      const errorPrefix = `Relation error on field ${connectionConfig.source.typeName}.${connectionConfig.name}:`;

      // Get sourceType
      if (
        !context.typeMap.hasOwnProperty(
          String(connectionConfig.source.typeName)
        )
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The source type "${String(
              connectionConfig.source.typeName
            )}" does not exist in type system`
          )
        );
        return;
      }
      const sourceType: TypeConfig =
        context.typeMap[String(connectionConfig.source.typeName)];
      if (!isObjectTypeConfig(sourceType)) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The source type "${String(
              connectionConfig.source.typeName
            )}" has to be of type object`
          )
        );
        return;
      }
      // Validate source key field
      if (
        !sourceType.fields.hasOwnProperty(
          connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
        )
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The field "${String(
              connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
            )}" does ` + `not exist on type ${sourceType.name}`
          )
        );
        return;
      }

      // Get node type
      if (
        !context.typeMap.hasOwnProperty(String(connectionConfig.node.typeName))
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The node type "${String(
              connectionConfig.node.typeName
            )}" does not exist in type system`
          )
        );
        return;
      }
      const nodeType: TypeConfig =
        context.typeMap[String(connectionConfig.node.typeName)];
      if (!isObjectTypeConfig(nodeType)) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The node type "${String(
              connectionConfig.node.typeName
            )}" has to be of type object`
          )
        );
        return;
      }
      // Validate node key field
      if (
        !nodeType.fields.hasOwnProperty(
          connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY
        )
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The field "${String(
              connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY
            )}" does ` + `not exist on type ${nodeType.name}`
          )
        );
        return;
      }

      // Validate node key field
      if (
        !sourceType.fields.hasOwnProperty(
          connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
        )
      ) {
        context.reportError(
          new PackageError(
            `${errorPrefix} The field "${String(
              connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
            )}" does ` + `not exist on type ${sourceType.name}`
          )
        );
        return;
      }

      // We have an edgeType
      if (connectionConfig.edge.typeName) {
        if (!context.typeMap.hasOwnProperty(connectionConfig.edge.typeName)) {
          context.reportError(
            new PackageError(
              `${errorPrefix} The type of the edge "${String(
                connectionConfig.edge.typeName
              )}" ` + 'does not exist in the type system'
            )
          );
          return;
        }

        const edgeType: TypeConfig =
          context.typeMap[String(connectionConfig.edge.typeName)];
        if (!isObjectTypeConfig(edgeType)) {
          context.reportError(
            new PackageError(
              `${errorPrefix} The edge type "${String(
                connectionConfig.edge.typeName
              )}" has to be of type object`
            )
          );
          return;
        }
        // Check if type on source node matches
        const sourceField = connectionConfig.edge.sourceField;
        const sourceKeyFieldConfig =
          sourceType.fields[
            connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY
          ];
        const expectedSourceFieldTypeName =
          sourceKeyFieldConfig.typeName === 'ID' &&
          (sourceType.interfaces || []).includes('Node')
            ? connectionConfig.source.typeName
            : sourceKeyFieldConfig.typeName;

        if (
          !sourceField ||
          !edgeType.fields.hasOwnProperty(sourceField) ||
          // Check if we have relation to object or a custom key
          normalizeFieldType(edgeType.fields[sourceField].typeName) !==
            normalizeFieldType(expectedSourceFieldTypeName)
        ) {
          context.reportError(
            new PackageError(
              `${errorPrefix} The source field of the edge has to be of type ${expectedSourceFieldTypeName}`
            )
          );
          return;
        }

        // Check if type on node matches
        const nodeField = connectionConfig.edge.nodeField;
        const nodeKeyFieldConfig =
          nodeType.fields[
            connectionConfig.node.keyField || DEFAULT_PRIMARY_KEY
          ];
        const expectedNodeFieldTypeName =
          nodeKeyFieldConfig.typeName === 'ID'
            ? connectionConfig.node.typeName
            : nodeKeyFieldConfig.typeName;
        if (
          !nodeField ||
          !edgeType.fields.hasOwnProperty(nodeField) ||
          // Check if we have relation to object or a custom key
          edgeType.fields[nodeField].typeName !== expectedNodeFieldTypeName
        ) {
          context.reportError(
            new PackageError(
              `${errorPrefix} The node field of the edge has to be of type ${expectedNodeFieldTypeName}`
            )
          );
        }
      } else {
        // Connection is defined via inline field on node
        const edgeType: TypeConfig =
          context.typeMap[connectionConfig.node.typeName];
        if (!edgeType || !isObjectTypeConfig(edgeType)) {
          context.reportError(
            new PackageError(`${errorPrefix} The node has to be of type object`)
          );
          return;
        }

        // Check if nodeField exists and is of right type
        const sourceField = connectionConfig.edge.sourceField;
        const sourceKeyField =
          connectionConfig.source.keyField || DEFAULT_PRIMARY_KEY;
        if (
          (!sourceField && sourceField !== null) ||
          !edgeType.fields.hasOwnProperty(sourceField) ||
          edgeType.fields[sourceField].typeName !==
            connectionConfig.source.typeName
        ) {
          // Check if we have keyField defined on source
          if (sourceKeyField && sourceKeyField !== 'id') {
            // @FIXME: Add tests for relation
            if (
              !sourceType.fields.hasOwnProperty(sourceKeyField) ||
              !edgeType.fields.hasOwnProperty(sourceField) ||
              normalizeFieldType(sourceType.fields[sourceKeyField].typeName) !==
                normalizeFieldType(edgeType.fields[sourceField].typeName)
            ) {
              context.reportError(
                new PackageError(
                  `${errorPrefix} The field types of the connected ` +
                    'fields between the source and the edge do not match in the relation path.'
                )
              );
            }
          } else {
            // No source keyField, expect relation on primary key
            context.reportError(
              new PackageError(
                `${errorPrefix} The source field of the edge ` +
                  `has to be of type ${connectionConfig.source.typeName}`
              )
            );
          }
        }
      }
    },
  };
}

/**
 * Normalizes the field type name so we can match ID fields with String for example
 * @param typeName
 */
function normalizeFieldType(typeName: string): string {
  if (typeName === 'ID') {
    return 'String';
  }
  return typeName;
}

export default ConnectionEdgeFieldTypesMatch;
