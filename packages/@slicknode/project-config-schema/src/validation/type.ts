/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */

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
    [x: string]: string | number | null;
  };
};

export type SanitizerConfig = {
  /**
   * The type name of the sanitizer
   */
  type: string;
  /**
   * Configuration options that are passed to the sanitizer
   */
  config?: {
    [x: string]: string | number | null;
  };
};
