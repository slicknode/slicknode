/**
 * Throws an error if the provided value is not a valid namespace
 * @param value
 */
import {NAMESPACE_REGEX} from '../validation/constants';

export function namespace(value: string) {
  if (value.match(NAMESPACE_REGEX)) {
    throw new Error('Value is not a valid namespace');
  }

  return value;
}
