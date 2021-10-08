/**
 * Created by Ivo Meißner on 14.09.17.
 *
 */

import Joi from 'joi';

import {
  PUBLIC_MODULE_NAME_REGEX,
  PRIVATE_MODULE_NAME_REGEX,
  NAMESPACE_REGEX,
  RUNTIME_MEMORY_SIZES,
} from './constants';

export const runtime = Joi.object().keys({
  engine: Joi.string().valid('nodejs@8', 'nodejs@10', 'nodejs@12').required(),
  memory: Joi.number()
    .integer()
    .valid(...RUNTIME_MEMORY_SIZES),
});

const handler = Joi.string()
  .regex(/^([a-zA-Z0-9_]+)([a-zA-Z0-9_\-.]*)(\/([a-zA-Z0-9_\-.]+))*$/)
  .required();

const preMutationHook = Joi.object().keys({
  event: Joi.string()
    .regex(/^mutation\.([a-zA-Z0-9_]+)\.BEFORE$/)
    .required(),
  handler,
});

const postMutationHook = Joi.object().keys({
  event: Joi.string()
    .regex(/^mutation\.([a-zA-Z0-9_]+)\.AFTER$/)
    .required(),
  handler,
  config: Joi.object().keys({
    query: Joi.string(),
  }),
});

/**
 * Available event listeners
 */
export const listeners = Joi.alternatives().try(
  preMutationHook,
  postMutationHook
);

/**
 * Schema for module slicknode.yml configuration
 */
export const app = Joi.object().keys({
  runtime,
  listeners: Joi.array().items(listeners),
  resolvers: Joi.object().pattern(
    /^([a-zA-Z0-9_]+)$/,
    Joi.object().pattern(
      /^([a-zA-Z0-9_]+)$/,
      Joi.object().keys({
        handler,
      })
    )
  ),
  module: Joi.object()
    .keys({
      id: Joi.string().regex(PRIVATE_MODULE_NAME_REGEX).required(),
      namespace: Joi.string().regex(NAMESPACE_REGEX).required(),
      label: Joi.string().max(64).required(),
      remote: Joi.object().keys({
        endpoint: Joi.string().required(),
        headers: Joi.object().pattern(
          /^([A-Za-z0-9-]+)$/,
          Joi.string().min(1).max(4096).required()
        ),
      }),
    })
    .required(),
});

/**
 * Schema for project level slicknode.yml
 */
export const config = Joi.object().keys({
  dependencies: Joi.object()
    .pattern(PRIVATE_MODULE_NAME_REGEX, Joi.string())

    .pattern(PUBLIC_MODULE_NAME_REGEX, Joi.valid('latest')),
});
