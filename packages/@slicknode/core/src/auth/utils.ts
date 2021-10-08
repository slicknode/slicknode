/**
 * Created by Ivo Meißner on 15.12.16.
 *
 */

import bcrypt from 'bcryptjs';

import {
  assertObjectTypeConfig,
  isObjectTypeConfig,
  TypeKind,
} from '../definition';
import toColumnName from '../schema/handler/postgres/toColumnName';
import { Request } from 'express';
import _ from 'lodash';
import {
  AUTH_DEFAULT_ACCESS_TOKEN_LIFETIME,
  AUTH_DEFAULT_REFRESH_TOKEN_LIFETIME,
} from '../config';
import jwt from 'jsonwebtoken';
import { Permission, AuthContext, Role } from './type';
import {
  FieldConfig,
  ObjectTypeConfig,
  TypeConfigMap,
  ProjectRuntimeInfo,
} from '../definition';
import {
  AccessDeniedError,
  AccessTokenExpiredError,
  AccessTokenInvalidError,
} from '../errors';
import { defaultFieldResolver, GraphQLFieldResolver } from 'graphql';
import Context from '../context';
import { getSurrogateKeys } from '../cache/surrogate/utils';

const SALT_ROUNDS = 10;

export const AUTH_COOKIE_NAME = '_sn_sess';
export const AUTH_REFRESH_COOKIE_NAME = '_sn_refresh';

export const DEFAULT_AUTH_CONTEXT: AuthContext = {
  uid: null,
  write: true,
  roles: [Role.ANONYMOUS],
};

export interface IUserAuthInfo {
  isAdmin?: boolean;
  isStaff?: boolean;
  isActive?: boolean;
  id?: string;
  roles?: Array<Role>;
}

interface AccessTokenPayload {
  uid: string | null;
  write: 0 | 1;
  roles: Role[];
}

interface RefreshTokenPayload {
  tid: string;
}

/**
 * Returns a Promise that returns the password hash
 * @param password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Returns a promise that checks the password
 * @param password
 * @param hash
 */
export async function checkPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (password === null) {
    return false;
  }
  return await bcrypt.compare(password, hash);
}

/**
 * Returns the issuer for the context
 * @param project
 */
export function getIssuer(
  project: ProjectRuntimeInfo | undefined | null
): string {
  return project ? String(project.id) : '_root';
}

type GenerateAccessTokenOptions = {
  user: IUserAuthInfo;
  issuer: string;
  maxAge?: number; // Maximum age of the token in seconds,
  write?: boolean;
  secret: string;
};

/**
 * Generates an access token for the given user
 * @param options
 */
export function generateAccessToken(
  options: GenerateAccessTokenOptions
): string {
  // Merge options with default values
  const { user, issuer, maxAge, write, secret } = {
    ...{
      maxAge: 3600,
      write: false,
    },
    ...options,
  } as GenerateAccessTokenOptions;
  const payloadWrite = write ? 1 : 0;
  const payload: AccessTokenPayload = {
    write: payloadWrite,
    uid: null,
    roles: [],
  };
  const active = _.get(user, 'isActive') === true;

  if (_.get(user, 'id')) {
    payload.uid = active ? _.get(user, 'id') : null;
  }

  // Collect roles of user
  const userRoles = user.roles || [];
  if (active) {
    userRoles.push(Role.AUTHENTICATED);
  }
  if (active && _.get(user, 'isStaff')) {
    userRoles.push(Role.STAFF);
  }
  if (active && _.get(user, 'isAdmin')) {
    userRoles.push(Role.ADMIN);
  }
  payload.roles = _.uniq(userRoles);

  return jwt.sign(payload, secret, {
    expiresIn: maxAge,
    issuer,
  });
}

/**
 * Generates a refresh token for the given user
 *
 * @param user
 * @param issuer
 * @param context
 * @param maxAge Max age in seconds, default is 6 months
 */
async function generateRefreshToken(
  user: {
    [x: string]: any;
  },
  issuer: string,
  context: Context,
  maxAge: number = 15811200
): Promise<string> {
  const token = await context.db.RefreshToken.create({
    user: _.get(user, 'id'),
    expires: new Date(new Date().getTime() + 1000 * maxAge),
    userAgent: _.get(context.req.headers, 'user-agent'),
    ip: context.req.ip || '',
  });
  const payload = {
    tid: token.id,
  };

  return jwt.sign(payload, context.jwtSecret, {
    expiresIn: maxAge,
    issuer,
  });
}

/**
 * Creates a resolver that authorizes the current user via the given context
 * and returns NULL in case the user does not have permission to access
 * the given field
 */
export function createAuthorizingResolver(
  fieldName: string,
  fieldConfig: FieldConfig,
  typeConfig: ObjectTypeConfig,
  typeConfigs: TypeConfigMap
): GraphQLFieldResolver<any, Context> | undefined | null {
  // Check if we have permissions set or if we can use original resolver
  if (typeConfig.permissions && typeConfig.kind === TypeKind.OBJECT) {
    const hasPartialPermissions = typeConfig.permissions.some(
      (permission: Permission) => {
        return permission.fields && permission.fields.length > 0;
      }
    );

    if (typeConfig.permissions.length && !hasPartialPermissions) {
      // Check if the type of the field has its own permissions
      if (typeConfigs.hasOwnProperty(fieldConfig.typeName)) {
        // No permissions set, use original resolver
        const fieldTypeConfig = typeConfigs[fieldConfig.typeName];
        if (isObjectTypeConfig(fieldTypeConfig)) {
          if (!fieldTypeConfig.permissions) {
            return fieldConfig.resolve;
          }
        } else {
          return fieldConfig.resolve;
        }
      }
    }
  } else {
    // No permissions configured, return original resolver
    return fieldConfig.resolve;
  }

  // Return authorizing resolver
  return (obj, args, context, info) => {
    // Filter irrelevant permissions
    const relevantPermissions: Array<Permission> = (
      typeConfig.permissions || []
    ).filter((permission: Permission) => {
      return _.includes(context.auth.roles, permission.role);
    });

    // Check if access was granted via typeConfig of field
    const accessGranted = relevantPermissions.some((permission: Permission) => {
      // Check if query is set and matches current uid in context
      if (permission.query) {
        return false;
      }

      // Access is not limited to fields
      if (!permission.fields) {
        // Check if we have access restrictions on the type of the field
        if (
          typeConfigs.hasOwnProperty(fieldConfig.typeName) &&
          typeConfigs[fieldConfig.typeName].kind === TypeKind.OBJECT
        ) {
          const fieldTypeConfig = assertObjectTypeConfig(
            typeConfigs[fieldConfig.typeName]
          );
          // No permissions set, so no access restrictions
          if (!fieldTypeConfig.permissions) {
            return true;
          }

          // Check if current context has a role that has access to the type of the field
          return fieldTypeConfig.permissions.some(
            (relatedPermission: Permission) => {
              return _.includes(context.auth.roles, relatedPermission.role);
            }
          );
        }

        return true;
      }

      // Check if access is granted on given field
      return _.includes(permission.fields, fieldName);
    });

    if (!accessGranted) {
      // Check if access is granted via permission query through more than one level
      // Filtering of objects happens on DB level
      // Create an intersection of all limiting fields to only return values
      // for fields that match ALL permissions. Otherwise one filter might return
      // an object and another permissions allows field access, even though query
      // filter criteria is not met
      let allowedFields: Array<string> | undefined | null = null;
      let multiLevelFiltering = false;

      relevantPermissions.forEach((perm: Permission) => {
        if (perm.query) {
          multiLevelFiltering = multiLevelFiltering || Boolean(perm.query);
          // Access is limited to certain fields
          if (perm.fields) {
            // Only allow access to fields that are available in all matching permission filters
            allowedFields = allowedFields
              ? _.intersection(allowedFields, perm.fields)
              : perm.fields;
          }
        }
      });
      // Return NULL if we have no queryFiltering or if we have limited field access and fieldName
      // is not part of allowedFields
      if (
        !multiLevelFiltering ||
        (allowedFields && !_.includes(allowedFields, fieldName))
      ) {
        if (fieldConfig.required) {
          throw new AccessDeniedError('Permission denied');
        }
        return null;
      }
    }

    return fieldConfig.resolve
      ? fieldConfig.resolve(obj, args, context, info)
      : defaultFieldResolver(obj, args, context, info);
  };
}

/**
 * Checks if query filtering is required for the given type
 * with the provided context
 *
 * @param permissions
 * @param context
 * @returns {boolean}
 */
export function queryFilteringRequired(
  permissions: Array<Permission> | undefined | null,
  context: Context
): boolean {
  if (permissions) {
    // Check if user has full object permission
    return !permissions.some((permission: Permission) => {
      if (context.auth.roles.includes(permission.role)) {
        return !permission.query;
      }
      return false;
    });
  }

  return false;
}

/**
 * Generates a random password with the given length
 * @param length Length of the password
 * @param chars Optionally set the available characters to be used
 * @returns {string}
 */
export function randomPassword(
  length: number = 20,
  chars: string | undefined | null = null
): string {
  const possibleChars =
    chars ||
    'abcdefghijklmnopqrstuvwxyz!@#$%^&*()-+<>ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let pass = '';
  for (let x = 0; x < length; x++) {
    const i = Math.floor(Math.random() * possibleChars.length);
    pass += possibleChars.charAt(i);
  }
  return pass;
}

export type AuthTokenSet = {
  accessToken: string;
  accessTokenLifetime: number;
  refreshToken: string;
  refreshTokenLifetime: number;
};

type GenerateAuthTokenSetOptions = {
  user: IUserAuthInfo;
  context: Context;
  moduleId: string;
};

/**
 * Generates a token set for the given user
 * @param options
 */
export async function generateAuthTokenSet(
  options: GenerateAuthTokenSetOptions
): Promise<AuthTokenSet> {
  const { user, context, moduleId } = options;

  // @TODO: Make configurable
  const accessTokenLifetime = AUTH_DEFAULT_ACCESS_TOKEN_LIFETIME; // 15 min;
  const refreshTokenLifetime = AUTH_DEFAULT_REFRESH_TOKEN_LIFETIME; // 30 days
  const issuer = getIssuer(context.project);
  const refreshToken = await generateRefreshToken(
    user || {},
    issuer,
    context,
    refreshTokenLifetime
  );

  // Delete expired auth tokens
  await context.db.RefreshToken.delete(function () {
    this.where(toColumnName('expires'), '<', new Date());
  });

  // Update lastLogin for user
  await context.db.User.update(user.id, {
    lastLogin: new Date(),
  });

  // Add Login
  await context.db.Login.create({
    user: user.id,
    ip: context.req.ip,
    userAgent: context.req.get('User-Agent') || null,
    module: moduleId,
  });

  // Delete old logins
  await context.db.Login.delete(function () {
    this.where(
      toColumnName('createdAt'),
      '<',
      new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
    );
  });

  // Purge surrogate cache keys for User, Logins
  if (context.surrogateCache) {
    const userKeys = getSurrogateKeys({
      preview: false,
      typeConfig: context.schemaBuilder.getObjectTypeConfig('User'),
      node: null,
    });
    const loginKeys = getSurrogateKeys({
      preview: false,
      typeConfig: context.schemaBuilder.getObjectTypeConfig('Login'),
      node: null,
    });
    await context.surrogateCache.purge([userKeys.key, loginKeys.key]);
  }

  // Set auth read only token in cookie
  if (user) {
    // Set
    context.res.cookie(
      AUTH_COOKIE_NAME,
      generateAccessToken({
        user: user || {},
        issuer,
        maxAge: accessTokenLifetime,
        write: false,
        secret: context.jwtSecret,
      }),
      {
        maxAge: accessTokenLifetime * 1000,
        httpOnly: true, // The cookie only accessible by the web server
        // signed: true, // Indicates if the cookie should be signed
        secure: process.env.NODE_ENV === 'production', // Only send via HTTPS in production
      }
    );
    // Set refresh cookie
    context.res.cookie(AUTH_REFRESH_COOKIE_NAME, refreshToken, {
      maxAge: refreshTokenLifetime * 1000,
      httpOnly: true, // The cookie only accessible by the web server
      // signed: true, // Indicates if the cookie should be signed
      secure: process.env.NODE_ENV === 'production', // Only send via HTTPS in production
    });
  } else {
    context.res.cookie(AUTH_COOKIE_NAME, null);
    context.res.cookie(AUTH_REFRESH_COOKIE_NAME, null);
  }

  return {
    accessToken: generateAccessToken({
      user: user || {},
      issuer,
      maxAge: accessTokenLifetime,
      write: true,
      secret: context.jwtSecret,
    }),
    refreshToken,
    accessTokenLifetime,
    refreshTokenLifetime,
  };
}

/**
 * Creates an auth context from a JWT
 * @param request
 * @param project The project runtime info, if no project provided, root is assumed
 * @param secret
 */
export function getAuthContext(
  request: Request,
  project: ProjectRuntimeInfo | undefined | null,
  secret: string
): AuthContext {
  const issuer = getIssuer(project);
  const accessToken = _.get(request, 'headers.authorization');

  try {
    if (accessToken && accessToken.startsWith('Bearer ')) {
      const payload = jwt.verify(accessToken.substr(7), secret, {
        issuer,
        clockTolerance: 10,
      }) as AccessTokenPayload;
      if (!payload.roles || !payload.write) {
        throw new Error('Invalid payload in access token');
      }
      return {
        uid: payload.uid || null,
        write: true,
        roles: _.uniq([Role.ANONYMOUS, ...payload.roles]),
      };
    }
  } catch (e) {
    // Invalid token
    switch (e.name) {
      case 'TokenExpiredError':
        throw new AccessTokenExpiredError('The access token is expired');
      case 'JsonWebTokenError':
        throw new AccessTokenInvalidError('Invalid access token provided');
    }
  }

  // Check if we have token in cookie
  if (request.cookies && request.cookies[AUTH_COOKIE_NAME]) {
    try {
      const cookieToken = request.cookies[AUTH_COOKIE_NAME];
      if (cookieToken) {
        const payload = jwt.verify(cookieToken, secret, {
          issuer,
        }) as AccessTokenPayload;
        if (!payload.uid || !payload.roles || payload.write) {
          throw new Error('Invalid payload in access token');
        }
        return {
          uid: payload.uid,
          write: false, // Cookie tokens only get read only
          roles: [Role.ANONYMOUS, ...payload.roles] as Role[],
        };
      }
    } catch (e) {
      // Just don't use cookie token if this fails, maybe log eventually for fraud detection?
    }
  }

  // We have to create new object, because context is mutated in some tests
  return {
    ...DEFAULT_AUTH_CONTEXT,
  };
}

/**
 * Returns the ID of the refresh token if the refresh token is valid
 * Returns NULL if token was invalid or does not have ID within payload
 *
 * @param refreshToken
 * @param context
 */
export function getRefreshTokenId(
  refreshToken: string,
  context: Context
): string | undefined | null {
  try {
    const payload = jwt.verify(refreshToken, context.jwtSecret, {
      issuer: getIssuer(context.project),
    }) as RefreshTokenPayload;
    if (payload.tid) {
      return payload.tid;
    }
  } catch (e) {
    return null;
  }

  return null;
}
