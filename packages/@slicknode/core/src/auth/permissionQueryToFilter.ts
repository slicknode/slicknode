/**
 * Created by Ivo Meißner on 13.07.17.
 *
 */
import { parse, validate } from 'graphql';

import { Kind } from 'graphql';
import {
  GraphQLSchema,
  FieldNode,
  FragmentSpreadNode,
  InlineFragmentNode,
} from 'graphql';
import { getArgumentValues } from 'graphql/execution/values';

type ParsedQueryFilter = {
  [fieldName: string]: {
    filter: {
      [name: string]: any;
    };
  };
};

/**
 * Parses the query object and converts it to a filter that can be processed
 * by query filters
 * @param query
 * @param schema
 * @param variables
 */
export default function permissionQueryToFilter(
  query: string,
  schema: GraphQLSchema,
  variables: {
    [x: string]: any;
  } = {}
): ParsedQueryFilter {
  let result = {};

  const document = parse(query, { noLocation: true });
  const errors = validate(schema, document);

  // Throw error if validation failed
  if (errors && errors.length) {
    throw errors[0];
  }

  if (document.kind !== Kind.DOCUMENT || document.definitions.length !== 1) {
    throw new Error(
      'The permission query has to have only one document definition'
    );
  }

  // Check if we have a query
  const definition = document.definitions[0];
  if (
    (definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation !== 'query') ||
    definition.kind !== Kind.OPERATION_DEFINITION
  ) {
    throw new Error('Permission query needs to be of type query.');
  }

  // Get fields
  const selectionSet = definition.selectionSet;
  const rootFields = schema.getQueryType().getFields();
  result = selectionSet.selections.reduce(
    (
      res: {
        [x: string]: any;
      },
      node: FieldNode | FragmentSpreadNode | InlineFragmentNode
    ) => {
      if (node.kind !== Kind.FIELD) {
        throw new Error('Only field definitions allowed in permission query');
      }
      res[node.name.value] = getArgumentValues(
        rootFields[node.name.value],
        node,
        variables
      );
      return res;
    },
    result
  );

  return result;
}
