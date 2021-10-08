/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */

import { ValidatorConfig, Validator, SanitizerConfig, Sanitizer } from './type';

import {
  FieldConfig,
  FieldConfigMap,
  isInputObjectTypeConfig,
  isObjectTypeConfig,
  TypeConfig,
} from '../definition';

import * as validators from './validators';
import * as sanitizers from './sanitizers';

import {
  InputArgumentErrorInfo,
  InputArgumentErrorInfoMap,
  ValidationError,
} from '../errors';

import Context from '../context';

import _ from 'lodash';

const validatorRegistry = {
  ...validators,
};

const sanitizerRegistry = {
  ...sanitizers,
};

/**
 * Returns the validator for the given config
 * Raises an Error if validation could not be found
 * @param config
 * @returns {*}
 */
export function createValidator(config: ValidatorConfig): Validator {
  if (config.type in validatorRegistry) {
    return validatorRegistry[config.type];
  }

  throw new Error(
    'Validator ' + config.type + ' is not configured in validatorRegistry'
  );
}

export function validateInput(
  fields: FieldConfigMap,
  input: {
    [x: string]: any;
  },
  context: Context
): void {
  const __ = context.res.__;
  const errors: InputArgumentErrorInfoMap = {};

  // Validate input fields
  _.forOwn(fields, (config: FieldConfig, currentFieldName: string) => {
    if (!config.list) {
      // Validate simple value
      try {
        validateSingleValue({
          fieldName: currentFieldName,
          required: config.required || false,
          defaultValue: config.defaultValue,
          config,
          input,
          context,
        });
      } catch (e) {
        if (e instanceof ValidationError) {
          if (Object.keys(e.argumentErrors).length) {
            // We have a child errors, add field to path and merge with other errors
            errors[currentFieldName] = Object.keys(e.argumentErrors).reduce(
              (errorList, argName) => {
                e.argumentErrors[argName].forEach((childError) => {
                  errorList.push({
                    message: childError.message,
                    path: [argName, ...(childError.path || [])],
                  });
                });
                return errorList;
              },
              []
            );
          } else {
            errors[currentFieldName] = [
              {
                message: e.message,
              },
            ];
          }
        }
      }
    } else {
      const dimensions =
        typeof config.list === 'boolean' ? [config.list] : config.list;

      // Extract value from input
      const value = _.get(input, currentFieldName);

      // Check for NULL value
      if (value === null || _.isUndefined(value)) {
        // Check if field is required
        if (config.required && _.isUndefined(config.defaultValue)) {
          errors[currentFieldName] = [
            {
              message: __('Please provide a value for the field'),
            },
          ];
        }
      } else {
        const arrayErrors = validateArrayValue({
          config,
          value,
          required: dimensions,
          context,
          currentPath: [],
        });
        if (arrayErrors.length) {
          errors[currentFieldName] = arrayErrors;
        }
      }
    }
  });

  if (Object.keys(errors).length) {
    throw new ValidationError(
      __(
        'The provided input values could not be validated. Please check the values.'
      ),
      errors
    );
  }
}

function validateArrayValue(params: {
  config: FieldConfig;
  value: any[] | null | undefined;
  // The dimensions of the array
  required: boolean[];
  defaultValue?: any;
  currentPath: Array<number | string>;
  context: Context;
}): InputArgumentErrorInfo[] {
  const { value, config, currentPath, context } = params;
  const __ = context.res.__;
  const [currentValueRequired, ...required] = params.required;
  let errors = [];

  if (Array.isArray(value)) {
    // We have more dimensions, recursively go through dimensions, checking for NULL values
    if (required.length) {
      // Iterate through values
      value.forEach((arrayValue, index) => {
        if (arrayValue === null) {
          if (currentValueRequired) {
            errors.push({
              message: __('Please provide a value for the field'),
              path: [...currentPath, index],
            });
          }
        } else {
          const childErrors = validateArrayValue({
            currentPath: [...currentPath, index],
            required,
            context,
            config,
            value: arrayValue,
          });
          if (childErrors.length) {
            errors = [...errors, ...childErrors];
          }
        }
      });
    } else {
      value.forEach((arrayValue, index) => {
        try {
          validateSingleValue({
            config,
            input: { v: arrayValue },
            fieldName: 'v',
            required: currentValueRequired,
            context,
          });
        } catch (e) {
          if (e instanceof ValidationError) {
            if (e.argumentErrors.hasOwnProperty('v')) {
              const childErrors = e.argumentErrors.v.map((childError) => ({
                message: childError.message,
                path: [...currentPath, index, childError.path],
              }));
              errors = [...errors, ...childErrors];
            } else {
              errors.push({
                message: e.message,
                path: [...currentPath, index],
              });
            }
          } else {
            throw e;
          }
        }
      });
    }
  } else {
    throw new Error('Non array value passed to array validator');
  }

  return errors;
}

function validateSingleValue(params: {
  config: FieldConfig;
  input: { [name: string]: any };
  fieldName: string;
  required: boolean;
  defaultValue?: any;
  context: Context;
}) {
  const { input, fieldName, required, defaultValue, context, config } = params;
  const __ = context.res.__;
  const value = input[fieldName];

  if (value === null || _.isUndefined(value)) {
    // Check if field is required
    if (required && _.isUndefined(defaultValue)) {
      // eslint-disable-next-line
      throw new ValidationError(__('Please provide a value for the field'));
    }
  } else {
    // Run validators for field
    _.each(config.validators, (validatorConfig: ValidatorConfig) => {
      const validator = createValidator(validatorConfig);
      try {
        // Run validation
        validator(input, fieldName, __, validatorConfig.config || {});
      } catch (e) {
        // Overwrite default error message if set
        if (e instanceof ValidationError) {
          if (validatorConfig.message) {
            e.message = validatorConfig.message;
          }
        }
        throw e;
      }
    });

    // Run child type field validation if we have object
    if (context.schemaBuilder.typeConfigs.hasOwnProperty(config.typeName)) {
      const childTypeConfig: TypeConfig =
        context.schemaBuilder.typeConfigs[config.typeName];
      if (
        isObjectTypeConfig(childTypeConfig) ||
        isInputObjectTypeConfig(childTypeConfig)
      ) {
        try {
          // Run child validation
          validateInput(childTypeConfig.fields, value, context);
        } catch (e) {
          if (e instanceof ValidationError && false) {
            // Add error messages with the full path key to errors
            throw new ValidationError(e.message, {
              [fieldName]: Object.keys(e.argumentErrors).reduce(
                (errors, errorArgument) => {
                  const childErrors = e.argumentErrors[errorArgument];
                  for (let childError of childErrors) {
                    errors.push({
                      message: childError.message,
                      path: [errorArgument, ...(childError.path || [])],
                    });
                  }
                  return errors;
                },
                []
              ),
            });
          } else {
            throw e;
          }
        }
      }
    }
  }
}

/**
 * Returns the sanitizer for the given config
 * Raises an Error if sanitizer could not be found
 * @param config
 * @returns {*}
 */
export function createSanitizer(config: SanitizerConfig): Sanitizer {
  if (config.type in sanitizerRegistry) {
    return sanitizerRegistry[config.type];
  }

  throw new Error(
    'Sanitizer ' + config.type + ' is not configured in sanitizerRegistry'
  );
}

/**
 * Sanitizes the input values based on the field configuration
 *
 * @param fields
 * @param input
 */
export function sanitizeInput(
  fields: FieldConfigMap,
  input: {
    [x: string]: any;
  }
): {
  [x: string]: any;
} {
  const sanitizedValues = {
    ...input,
  };
  _.forOwn(fields, (fieldConfig: FieldConfig, fieldName: string) => {
    // Check if sanitizers are configured and we have Non-NULL value
    if (_.has(input, fieldName) && _.get(input, fieldName) !== null) {
      if (fieldConfig.sanitizers && fieldConfig.sanitizers.length) {
        fieldConfig.sanitizers.forEach((sanitizerConfig: SanitizerConfig) => {
          // Sanitize value
          sanitizedValues[fieldName] = createSanitizer(sanitizerConfig)(
            sanitizedValues[fieldName],
            sanitizerConfig.config || {}
          );
        });
      }
    }
  });
  return sanitizedValues;
}
