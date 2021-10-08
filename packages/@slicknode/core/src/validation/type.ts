/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */

/**
 * A validator function that throws an error message in case of
 * a validation error
 *
 * @param values All values that are part of the current validated object
 * @param field The name of the field within the validated object that should be evaluated
 * @param __ Translator function as defined in i18n.__
 * @param config The configuration object with specific settings
 *
 * @throws ValidationError
 */
export type Validator = (
  values: {
    [x: string]: any;
  },
  field: string,
  __: Function,
  config: {
    [x: string]: any;
  }
) => any;

export type ValidatorConfig = {
  /**
   * The type name for the validator
   * It needs to exist within ValidatorFactory
   */
  type: string;
  /**
   * An individual error message.
   * If no message is provided, the default error message is used
   */
  message?: string;
  /**
   * Configuration with additional parameters
   */
  config?: {
    [x: string]: any;
  };
};

/**
 * A function that sanitizes the input value.
 * For example to remove trailing whitespace etc.
 *
 * Returns the sanitized value
 */
export type Sanitizer = (
  value: any,
  config: {
    [x: string]: any;
  }
) => any;

export type SanitizerConfig = {
  /**
   * The type name of the sanitizer
   */
  type: string;
  /**
   * Configuration options that are passed to the sanitizer
   */
  config?: {
    [x: string]: any;
  };
};
