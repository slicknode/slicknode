class InvariantError extends Error {}

/**
 * Checks if the boolean value of the given object is true, if not, throws AssertionError with the error message
 * @param value
 * @param message
 */
export function invariant(value: any, message: string) {
  if (!Boolean(value)) {
    throw new InvariantError(message);
  }
  return value;
}
