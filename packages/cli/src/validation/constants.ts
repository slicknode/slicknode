/**
 * Created by Ivo Meißner on 11.08.17.
 */

export const PRIVATE_MODULE_NAME_REGEX =
  /^@private\/([a-z0-9]+)((-[a-z0-9]+)*)$/;
export const PUBLIC_MODULE_NAME_REGEX = /^([a-z0-9]+)((-[a-z0-9]+)*)$/;

export const NAMESPACE_REGEX = /^([A-Z]+)([a-zA-Z0-9]+)$/;
export const ENVIRONMENT_REGEX = /^([a-z0-9]+)((-[a-z0-9]+)*)$/;
export const MODULE_LABEL_MAX_LENGTH = 64;

export const PROJECT_ALIAS_REGEX = /^([a-z]+)([a-z0-9]*)((-[a-z0-9]+)*)$/;
