/**
 * Created by Ivo Meißner on 14.09.17.
 *
 * @flow
 */

import Joi from 'joi';

import {
  NAMESPACE_REGEX,
  PRIVATE_MODULE_NAME_REGEX,
  PUBLIC_MODULE_NAME_REGEX,
} from './constants';

export const runtime = Joi.object().keys({
  engine: Joi.string().valid('nodejs@8').required(),
});

const handler = Joi.string().regex(/^([a-zA-Z0-9_]+)([a-zA-Z0-9_\-.]*)(\/([a-zA-Z0-9_\-.]+))*$/).required();

/**
 * Before mutation hook
 */
const beforeMutationHook = Joi.object().keys({
  event: Joi.string().regex(/^mutation\.([a-zA-Z0-9_]+)\.BEFORE$/).required(),
  handler,
});

/**
 * After mutation hook
 */
const afterMutationHook = Joi.object().keys({
  event: Joi.string().regex(/^mutation\.([a-zA-Z0-9_]+)\.AFTER/).required(),
  handler,
  config: Joi.object().keys({
    query: Joi.string(),
  }),
});

/**
 * Available event listeners
 */
export const listeners = Joi.alternatives().try(
  beforeMutationHook,
  afterMutationHook,
);

/**
 * Schema for module slicknode.yml configuration
 */
export const module = Joi.object().keys({
  module: Joi.object().keys({
    id: Joi.string().regex(PRIVATE_MODULE_NAME_REGEX).required(),
    namespace: Joi.string().regex(NAMESPACE_REGEX).required(),
    label: Joi.string().max(64).required(),
  }).required(),
  runtime,
  listeners: Joi.array().items(listeners),
  resolvers: Joi.object().pattern(
    /^([a-zA-Z0-9_]+)$/,
    Joi.object().pattern(
      /^([a-zA-Z0-9_]+)$/,
      Joi.object().keys({
        handler,
      }),
    ),
  ),
});

/**
 * Schema for root slicknode.yml
 */
export const slicknode = Joi.object().keys({
  dependencies: Joi.object()
    .pattern(PRIVATE_MODULE_NAME_REGEX, Joi.string())
    .pattern(PUBLIC_MODULE_NAME_REGEX, Joi.valid('latest')),
});
