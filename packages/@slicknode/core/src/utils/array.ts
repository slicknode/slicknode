/**
 * Checks if an array of string values has duplicates
 * @param values
 */
export function hasDuplicates(values: string[]) {
  return new Set(values).size !== values.length;
}
