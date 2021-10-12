/**
 * Created by Ivo Meißner on 23.11.16.
 *
 */
import { GraphQLError, GraphQLFormattedError } from 'graphql';

import _ from 'lodash';

export enum ErrorCode {
  /**
   * General internal server error that is exposed to the user
   */
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  /**
   * Input validation failure
   */
  INPUT_VALIDATION_FAILED = 'INPUT_VALIDATION_FAILED',
  /**
   * Access to a specific action was denied
   */
  ACCESS_DENIED = 'ACCESS_DENIED',
  /**
   * Action requires login but user is not authenticated
   */
  LOGIN_REQUIRED = 'LOGIN_REQUIRED',
  /**
   * Provided access token is invalid
   */
  ACCESS_TOKEN_INVALID = 'ACCESS_TOKEN_INVALID',
  /**
   * Provided access token is expired
   */
  ACCESS_TOKEN_EXPIRED = 'ACCESS_TOKEN_EXPIRED',
  /**
   * Migration failed due to a package error
   */
  MIGRATION_FAILED_PACKAGE_ERROR = 'MIGRATION_FAILED_PACKAGE_ERROR',
  /**
   * Resource limit error
   */
  RESOURCE_LIMIT_ERROR = 'RESOURCE_LIMIT_ERROR',
  /**
   * An error occured in the remote API
   */
  REMOTE_API_ERROR = 'REMOTE_API_ERROR',
}

export class AssertionError extends Error {}

/**
 * An error that is displayed to the user in production
 */
export class UserError extends Error {
  public code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  public exposeMessage: boolean = true;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UserError.prototype);
  }

  /**
   * Returns additional fields that are added to the GraphQL response
   * @returns {{code: ErrorCode}}
   */
  getGraphQLErrorFields(): {
    [x: string]: any;
  } {
    return {
      code: this.code,
    };
  }
}

export type InputArgumentErrorInfo = {
  path?: Array<string | number>;
  message: string;
};

export type InputArgumentErrorInfoMap = {
  [argumentName: string]: InputArgumentErrorInfo[];
};

/**
 * Input validation failed for the given fields
 */
export class ValidationError extends UserError {
  argumentErrors: InputArgumentErrorInfoMap;

  constructor(message: string, argumentErrors?: InputArgumentErrorInfoMap) {
    super(message);
    Object.setPrototypeOf(this, ValidationError.prototype);

    this.code = ErrorCode.INPUT_VALIDATION_FAILED;
    this.argumentErrors = argumentErrors || {};
  }

  getGraphQLErrorFields(): {
    [x: string]: any;
  } {
    return {
      ...super.getGraphQLErrorFields(),
      ...(Object.keys(this.argumentErrors).length
        ? { arguments: this.argumentErrors }
        : {}),
    };
  }
}

/**
 * Access is denied to perform a certain action
 */
export class AccessDeniedError extends UserError {
  public code = ErrorCode.ACCESS_DENIED;
}

/**
 * Access is denied to perform a certain action
 */
export class LoginRequiredError extends UserError {
  public code = ErrorCode.LOGIN_REQUIRED;
}

/**
 * Access token is expired
 */
export class AccessTokenExpiredError extends UserError {
  public code = ErrorCode.ACCESS_TOKEN_EXPIRED;
}

/**
 * Access token is expired
 */
export class ResourceLimitError extends UserError {
  public code = ErrorCode.RESOURCE_LIMIT_ERROR;
}

/**
 * Access token is invalid
 */
export class AccessTokenInvalidError extends UserError {
  public code = ErrorCode.ACCESS_TOKEN_INVALID;
}

/**
 * An error occured in the remote API
 */
export class RemoteApiError extends UserError {
  public code = ErrorCode.REMOTE_API_ERROR;
}

/**
 * An error in a project source package
 */
export class PackageError extends UserError {
  public code = ErrorCode.MIGRATION_FAILED_PACKAGE_ERROR;
  module: string | undefined | null;
  path: Array<string> | undefined | null;
  description: string;

  /**
   *
   * @param message
   * @param module The ID of the app
   * @param path The path to the object that caused the error. For example `[ "types", "TypeName", "fieldName" ]`
   */
  constructor(message: string, module?: string, path?: Array<string>) {
    super(message);
    Object.setPrototypeOf(this, PackageError.prototype);

    this.module = module || null;
    this.path = path || null;
    this.description = message;
  }
}

/**
 * Given a GraphQLError, format it according to the rules described by the
 * Response Format, Errors section of the GraphQL Specification.
 */
export function formatError(error: GraphQLError): GraphQLFormattedError {
  if (!error) {
    throw new Error('Received null or undefined error.');
  }
  const extensions = error.extensions;
  const formattedError: any = {
    message: error.message,
    ...(error.locations ? { locations: error.locations } : {}),
    ...(error.path ? { path: error.path } : {}),
    ...(error.extensions ? { extensions: error.extensions } : {}),
  };
  const originalError = error.originalError as any; // @TODO: Add proper typing
  if (originalError) {
    if (!originalError.exposeMessage && process.env.NODE_ENV === 'production') {
      formattedError.message =
        'An internal server error occurred. Please reach out to support.';
      console.error(originalError);
      console.error(originalError.stack);
    }

    if (originalError.getGraphQLErrorFields) {
      formattedError.extensions = {
        ...(formattedError.extensions || {}),
        ...(originalError.getGraphQLErrorFields
          ? originalError.getGraphQLErrorFields()
          : {}),
      };
    }
  }
  return formattedError;
}
