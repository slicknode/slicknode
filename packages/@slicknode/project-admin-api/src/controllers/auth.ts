import { generateAuthTokenSet } from '@slicknode/core';
import { IUserAuthInfo } from '@slicknode/core/build/auth/utils';
import { RequestHandler } from 'express';
import gql from 'graphql-tag';
import Joi from 'joi';
import Client from '@slicknode/client-node';
import { DEFAULT_ROOT_API_ENDPOINT } from '../constants';
import { AdminApiOptions } from '../types';

const authenticateInputSchema = Joi.object({
  code: Joi.string().required(),
}).required();

const VERIFY_AUTH_CODE_MUTATION = gql`
  mutation VerifyAuthCode($input: verifyProjectAuthCodeInput!) {
    verifyProjectAuthCode(input: $input) {
      success
      email
      firstName
      lastName
      isAdmin
      isStaff
      externalUserId
    }
  }
`;

const UPDATE_PROJECT_USER_MUTATION = gql`
  mutation UpdateProjectUser($input: updateProjectAuthCodeUserInput!) {
    updateProjectAuthCodeUser(input: $input) {
      success
    }
  }
`;

export const AuthController = {
  /**
   * Authenticates a user with an auth code that is returns from the
   * Slicknode root API
   *
   * @param req
   * @param res
   */
  authenticate:
    ({ secret, rootApiEndpoint }: AdminApiOptions): RequestHandler =>
    async (req, res, next) => {
      if (!req.context) {
        return next(new Error('Context not found in express request object'));
      }

      const result = authenticateInputSchema.validate(req.body);
      if (result.error) {
        return next(result.error);
      }
      const { code } = result.value;

      // Verify auth code
      const variables = {
        input: {
          code,
          adminSecret: secret,
        },
      };

      try {
        const client = new Client({
          endpoint: rootApiEndpoint || DEFAULT_ROOT_API_ENDPOINT,
        });
        const { data, errors } = await client.fetch(
          VERIFY_AUTH_CODE_MUTATION,
          variables
        );
        if (errors?.length) {
          throw new Error(`Failed to verify auth code: ${errors[0].message}`);
        }

        // Check for GraphQL errors
        if (!data?.verifyProjectAuthCode?.success) {
          throw new Error('Auth code verification not successful');
        }

        const { email, firstName, lastName, isStaff, isAdmin, externalUserId } =
          data.verifyProjectAuthCode;
        const filter = externalUserId
          ? // Find by ID if explicitly configured in Slicknode root API
            { id: externalUserId }
          : // Lookup by email address otherwise
            { email };

        let user: IUserAuthInfo | null = (await req.context.db.User.find(
          filter
        )) as IUserAuthInfo | null;
        if (!user) {
          user = (await req.context.db.User.create({
            email,
            firstName: firstName,
            lastName,
            isStaff,
            isAdmin,
          })) as IUserAuthInfo | null;
        }
        if (!user) {
          throw new Error('Could not find or create user in project');
        }

        // Assign user to project
        if (!externalUserId) {
          await client.fetch(UPDATE_PROJECT_USER_MUTATION, {
            input: {
              code,
              adminSecret: secret,
              externalUserId: String(user.id),
            },
          });
        }

        const authTokens = await generateAuthTokenSet({
          context: req.context,
          moduleId: 'auth',
          user,
        });

        return res.json({
          success: true,
          data: authTokens,
        });
      } catch (e: any) {
        return res.status(500).json({
          success: false,
          message: e.message,
        });
      }
    },
};
