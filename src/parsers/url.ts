import * as validator from 'validator';
import IsURLOptions = ValidatorJS.IsURLOptions;

interface IUrlParserParams extends IsURLOptions {
  message?: string;
}

/**
 * Parser to validate if the input value is a valid URL
 * @param params
 */
export function url(params: IUrlParserParams = {}) {
  return (value: string) => {
    const {message, ...options} = params;
    if (!validator.isURL(value, options)) {
      throw new Error(message || `Value "${value}" is not a valid URL`);
    }
    return value;
  };
}
