/**
 * Helper function to unify stderr output across node versions
 *
 * @param error
 */
export function normalizeStderr(error: string): string {
  return error
    .split('\n ›')
    .map((s) => s.trim())
    .join(' ');
}
