import { transformConfig } from '@slicknode/project-config-transform';
import {
  buildNodePermissionDocument,
  createPermissionQuerySchema,
} from '@slicknode/core';
import { RequestHandler } from 'express';
import { AdminApiOptions } from '../types';
import { printSchema } from 'graphql';
import Joi from 'joi';

const permissionsInputSchema = Joi.object({
  type: Joi.string()
    .required()
    .regex(/^[_A-Za-z][_0-9A-Za-z]*$/),
}).required();

export const ConfigController = {
  /**
   * Returns the admin config of the project
   * @returns
   */
  get: (): RequestHandler => async (req, res) => {
    if (req.context) {
      return res.json({
        success: true,
        message: 'OK',
        data: transformConfig({
          modules: req.context.schemaBuilder.getModules(),
          buildDefaultAdmin: true,
        }),
      });
    }

    return res.status(500).json({
      message:
        'Project config could not be loaded. No context defined in project',
    });
  },

  /**
   * Returns the permission schema and the permission query document for a given type
   *
   * Requires parameters: ?type=User
   */
  permissions:
    (_: AdminApiOptions): RequestHandler =>
    async (req, res, next) => {
      if (!req.context) {
        return next(new Error('Context not found in express request object'));
      }

      // Validate input values
      const { value: input, error } = permissionsInputSchema.validate(
        req.params
      );
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      const schemaBuilder = req.context.schemaBuilder;

      try {
        const typeConfig = schemaBuilder.getObjectTypeConfig(input.type);
        const schema = createPermissionQuerySchema(
          schemaBuilder.getSchema(),
          typeConfig
        );
        const document = buildNodePermissionDocument(typeConfig);
        return res.json({
          success: true,
          message: 'OK',
          data: {
            schema: printSchema(schema),
            document,
          },
        });
      } catch (e: any) {
        return res
          .status(
            e.message.includes('not registered in schema builder') ? 404 : 500
          )
          .json({
            success: false,
            message: e.message,
          });
      }
    },
};
