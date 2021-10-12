/**
 * Returns the query string to be used for the autoComplete index
 * The columns are represented as ?? to be used in prepared statement
 *
 * @param fieldNames
 * @private
 */
export function getAutoCompleteQueryField(fieldNames: Array<string>): string {
  return fieldNames
    .map(() => {
      return 'coalesce(cast(?? as text), \'\')';
    })
    .join(" || ' ' || ");
}
