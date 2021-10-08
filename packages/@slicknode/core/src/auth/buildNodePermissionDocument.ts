/**
 * Created by Ivo Meißner on 12.08.17.
 *
 */

import { Permission, OperationType } from './type';

import { toEnumRole } from './roles';
import { parse, print, Kind } from 'graphql';
import { OperationDefinitionNode, DocumentNode } from 'graphql';
import { ObjectTypeConfig } from '../definition';
import prettier from 'prettier/standalone';
import parserGraphql from 'prettier/parser-graphql';

type OperationPermission = {
  permission: Permission;
  operation: OperationType;
};

/**
 * Converts the node permissions into a GraphQL query document
 * @param typeConfig
 */
export default function buildNodePermissionDocument(
  typeConfig: ObjectTypeConfig
): string {
  // Build permission map to consolidate multiple operations with the same query and role
  // in one query
  const permissionMap = {};
  const permissions = Object.keys(typeConfig.mutations || {}).reduce(
    (result, key) => {
      if (typeConfig.mutations) {
        result[key.toUpperCase()] = typeConfig.mutations[key];
      }
      return result;
    },
    {}
  );
  if (typeConfig.permissions) {
    permissions['READ'] = typeConfig.permissions;
  }

  Object.keys(permissions).forEach((operation) => {
    permissions[operation].forEach((perm: Permission) => {
      const groupKey = String(perm.role) + (perm.query || '');
      const opPerm = {
        permission: perm,
        operation,
      };
      if (permissionMap.hasOwnProperty(groupKey)) {
        permissionMap[groupKey].push(opPerm);
      } else {
        permissionMap[groupKey] = [opPerm];
      }
    });
  });

  return Object.keys(permissionMap)
    .map((key) => permissionMap[key])
    .map((permList: Array<OperationPermission>, index: number) => {
      const operations = permList.map((perm) => perm.operation);
      const firstPerm = permList[0];
      const role = firstPerm.permission.role;

      // Create scope query and add the node filter to the query definition if a filter
      // query is defined in permission

      // Do not add operations arg for mutation type
      const isMutation = typeConfig.name === 'Mutation';
      const operationsArg = !isMutation
        ? `, operations: [${operations.join(', ')}]`
        : '';
      const fieldsArg = firstPerm.permission.fields
        ? `, fields: ${JSON.stringify(firstPerm.permission.fields)}`
        : '';
      const fullDocument = parse(`
        query ${typeConfig.name}Permission${index + 1} {
          scope(role: ${toEnumRole(role)}${operationsArg}${fieldsArg})
        }
      `);
      if (firstPerm.permission.query) {
        const queryDocument = parse(firstPerm.permission.query, {
          noLocation: true,
        });
        const queryDef = getOperationDefinition(queryDocument);
        const scopeDef = getOperationDefinition(fullDocument);
        // We mutate the definitions here, figure out a better way so we don't have to use 'as any'
        (scopeDef.variableDefinitions as any) = [
          ...(scopeDef.variableDefinitions || []),
          ...(queryDef.variableDefinitions || []),
        ] as any;
        scopeDef.selectionSet.selections = [
          ...scopeDef.selectionSet.selections,
          ...queryDef.selectionSet.selections,
        ] as any;
      }

      return printDocument(fullDocument);
    })
    .join('\n\n');
}

function getOperationDefinition(
  document: DocumentNode
): OperationDefinitionNode {
  if (document.definitions && document.definitions.length) {
    const definition = document.definitions[0];
    if (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === 'query'
    ) {
      return definition;
    }
  }

  throw new Error('Permission query has no query definition');
}

function printDocument(query: DocumentNode): string {
  return prettier.format(print(query), {
    parser: 'graphql',
    plugins: [parserGraphql],
  });
}
