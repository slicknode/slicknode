/**
 * Created by Ivo Meißner on 02.03.19
 *
 */
import _ from 'lodash';

type PropertyMapping = {
  [oldKey: string]: string;
};

interface IDeepReplaceVariablesParams {
  // The source object to be transformed
  source: Object;

  // An object of variables values that can be used in the source property values
  // Can be multiple levels deep
  variables: Object;
}

/**
 * Replaces variable placeholders in an object
 *
 * @param params
 */
export function deepReplaceVariables(
  params: IDeepReplaceVariablesParams
): {
  [x: string]: any;
} {
  const result = {};
  Object.keys(params.source).forEach((key) => {
    const currentValue = params.source[key];
    if (_.isString(currentValue)) {
      // Replace variables in string
      result[key] = currentValue.replace(
        /\${( )*([a-zA-Z0-9.-])+( )*}/g,
        (match) => {
          const inner = match.substr(2, match.length - 3).trim();
          const path = inner.split('.');

          return path.reduce((vars, part) => {
            return (
              (_.isObject(vars) && vars.hasOwnProperty(part) && vars[part]) ||
              ''
            );
          }, params.variables);
        }
      );
    } else if (_.isObject(currentValue)) {
      result[key] = deepReplaceVariables({
        ...params,
        source: currentValue,
      });
    } else {
      result[key] = currentValue;
    }
  });
  return result;
}

/**
 * Recursively convert snake_case object properties to camelCase
 * @param obj
 * @param mappings Override specific property key conversions
 * @returns {{}}
 */
export function snakeToCamelCaseObject(
  obj: {
    [x: string]: any;
  },
  mappings: PropertyMapping = {}
): {
  [x: string]: any;
} {
  const result = {};
  Object.keys(obj).forEach((key) => {
    const newKey = mappings.hasOwnProperty(key)
      ? mappings[key]
      : _.camelCase(key);
    result[newKey] = _.isObject(obj[key])
      ? snakeToCamelCaseObject(obj[key], mappings)
      : obj[key];
  });
  return result;
}

/**
 * Recursively convert camelCase object properties to snake_case
 * @param obj
 * @param mappings Override specific property key conversions
 * @returns {{}}
 */
export function camelToSnakeCaseObject(
  obj: {
    [x: string]: any;
  },
  mappings: PropertyMapping = {}
): {
  [x: string]: any;
} {
  const result = {};
  Object.keys(obj).forEach((key) => {
    const newKey = mappings.hasOwnProperty(key)
      ? mappings[key]
      : _.snakeCase(key);
    result[newKey] = _.isObject(obj[key])
      ? camelToSnakeCaseObject(obj[key], mappings)
      : obj[key];
  });
  return result;
}
