/**
 * Created by Ivo Meißner on 16.11.16.
 *
 */
import { Role } from './type';

export function toEnumRole(role: Role): string {
  switch (role) {
    case Role.ANONYMOUS:
      return 'ANONYMOUS';
    case Role.ADMIN:
      return 'ADMIN';
    case Role.RUNTIME:
      return 'RUNTIME';
    case Role.AUTHENTICATED:
      return 'AUTHENTICATED';
    case Role.STAFF:
      return 'STAFF';
    case Role.FULLY_AUTHENTICATED:
      return 'FULLY_AUTHENTICATED';
    default:
      throw new Error('Invalid role value');
  }
}
