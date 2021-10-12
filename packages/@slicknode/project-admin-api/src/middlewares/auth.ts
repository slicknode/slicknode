import { Role } from '@slicknode/core';
import { RequestHandler } from 'express';

const DEFAULT_REQUIRED_ROLES = [Role.ADMIN, Role.STAFF];

export interface IAuthMiddleware {
  roles?: Role[];
}

export const authMiddleware = (
  params: IAuthMiddleware = {}
): RequestHandler => (req, res, next) => {
  // Ensure user has the requred roles
  const matchingRoles = (
    params.roles || DEFAULT_REQUIRED_ROLES
  ).filter((role) => req.context?.auth.roles.includes(role));
  if (!matchingRoles.length) {
    if (!req.context?.auth.uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
      });
    }
  }
  return next();
};
