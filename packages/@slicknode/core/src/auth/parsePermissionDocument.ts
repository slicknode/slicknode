/**
 * Created by Ivo Meißner on 01.10.17.
 *
 */
import {
  parse,
  Kind,
  print,
  FieldNode,
  GraphQLField,
  GraphQLFieldConfig,
} from 'graphql';

import { getArgumentValues } from 'graphql/execution/values';
import { ObjectTypeConfig, TypeMutationPermission } from '../definition';
import { PackageError } from '../errors';
import { OperationType, Permission, Role } from './type';
import { createScopeFieldConfig } from './createPermissionQuerySchema';
import _ from 'lodash';

type PermissionSet = {
  permissions: Array<Permission>;
  mutations: TypeMutationPermission;
};

type ScopeArgValues = {
  fields?: Array<string>;
  role: Role;
  query?: string;
  operations: Array<OperationType>;
};

/**
 * Converts a graphql permission document to an object type permission set
 * @param sourceDocument
 * @param typeConfig
 * @returns {{permissions: Array, mutations: {create: Array, update: Array, delete: Array}}}
 */
export default function parsePermissionDocument(
  sourceDocument: string,
  typeConfig: ObjectTypeConfig
): PermissionSet {
  const scopeFieldConfig = createScopeFieldConfig(typeConfig);
  const scopeField: GraphQLField<any, any> = {
    name: 'scope',
    ...scopeFieldConfig,
    args: Object.keys(scopeFieldConfig.args || {}).map((name) => ({
      name,
      ...(scopeFieldConfig.args || {})[name],
    })),
  } as GraphQLField<any, any>;
  const permissionSet = {
    permissions: [],
    mutations: {
      create: [],
      update: [],
      delete: [],
      publish: [],
      unpublish: [],
    },
  };

  try {
    const ast = parse(sourceDocument);
    if (ast.kind !== Kind.DOCUMENT) {
      throw new Error('Schema has to be a valid GraphQL document');
    }
    ast.definitions.forEach((definition) => {
      switch (definition.kind) {
        case Kind.OPERATION_DEFINITION: {
          const selections = _.get(definition, 'selectionSet.selections', []);
          const scopeSelection: FieldNode = selections.find(
            (selection) => selection.name.value === 'scope'
          );
          if (!scopeSelection) {
            throw new PackageError(
              'Field "scope" is missing in permission query'
            );
          }
          const argValues: ScopeArgValues = getArgumentValues(
            scopeField,
            scopeSelection,
            {}
          ) as ScopeArgValues;

          // Build permission from arg values
          const permission: Permission = {
            role: argValues.role,
          };
          if (argValues.fields && argValues.fields.length) {
            // Validate field value
            argValues.fields.forEach((field) => {
              if (!field.match(/^[_A-Za-z][_0-9A-Za-z]*$/)) {
                throw new PackageError(
                  'Argument fields has invalid value in permission query. Can only specify valid field names.'
                );
              }
            });
            permission.fields = argValues.fields;
          }
          // If we have more than one field (the scope), create new query without scope
          // and attach to permission
          if (selections.length > 1) {
            const permissionQueryNode = {
              ...definition,
              selectionSet: {
                ...definition.selectionSet,
                selections: selections.filter(
                  (selection) => selection.name.value !== 'scope'
                ),
              },
            };
            permission.query = print(permissionQueryNode);
          }

          // Get operations
          let operations = argValues.operations || [];

          // If this is for mutation permissions, generated mutations do not exist, so use READ instead
          if (typeConfig.name === 'Mutation') {
            operations = ['READ'];
          }

          operations
            .map((operation) => {
              switch (operation) {
                case 'READ':
                  return permissionSet.permissions;
                case 'CREATE':
                  return permissionSet.mutations.create;
                case 'UPDATE':
                  return permissionSet.mutations.update;
                case 'DELETE':
                  return permissionSet.mutations.delete;
                case 'PUBLISH':
                  return permissionSet.mutations.publish;
                case 'UNPUBLISH':
                  return permissionSet.mutations.unpublish;
                default: {
                  throw new PackageError(
                    `Unsupported operation for permission scope ${operation}`
                  );
                }
              }
            })
            .forEach((permissionList) => permissionList.push(permission));
          break;
        }
        default: {
          throw new PackageError(
            'Permission documents can only contain valid permission queries'
          );
        }
      }
    });
  } catch (e) {
    throw new PackageError(`Could not parse permission document: ${e.message}`);
  }

  return permissionSet;
}
