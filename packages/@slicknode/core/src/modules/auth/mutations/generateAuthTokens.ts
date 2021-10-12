/**
 * Created by Ivo Meißner on 2019-09-01
 *
 */

import { ModuleConfig, MutationConfig } from '../../../definition';

import { generateAuthTokenSet, IUserAuthInfo } from '../../../auth/utils';

import { ValidationError } from '../../../errors';
import authTokenFields from '../authTokenFields';
import { Role } from '../../../auth';

const generateAuthTokens: MutationConfig = {
  name: 'generateAuthTokens',
  inputFields: {
    user: {
      typeName: 'ID',
      required: true,
      description: 'The ID of the user for the auth tokens',
      validators: [
        {
          type: 'gid',
          config: {
            types: 'User',
          },
        },
      ],
    },
    module: {
      typeName: 'String',
      required: true,
      description: 'The ID of the module that is requesting the auth tokens',
    },
  },
  fields: {
    ...authTokenFields,
  },
  // Only other modules can create reset token, no user can do so directly
  permissions: [
    {
      role: Role.RUNTIME,
    },
  ],
  complexity: 500,
  async mutate(input, context) {
    // Check if user is active
    const user = (await context.db.User.find({
      id: context.fromGlobalId(input.user).id,
      isActive: true,
    })) as IUserAuthInfo;
    if (!user) {
      throw new ValidationError(
        context.res.__(
          'mutations.generateAuthTokens.error.message:The token could not be generated'
        ),
        {
          input: [
            {
              message: context.res.__(
                'mutations.generateAuthTokens.error.user.message:The user could not be found in the system'
              ),
              path: ['user'],
            },
          ],
        }
      );
    }

    // Check if the module exists in context
    if (
      !context.schemaBuilder
        .getModules()
        .find((moduleConfig: ModuleConfig) => moduleConfig.id === input.module)
    ) {
      throw new ValidationError(
        context.res.__(
          'mutations.generateAuthTokens.error.message:The token could not be generated'
        ),
        {
          input: [
            {
              message: context.res.__(
                'mutations.generateAuthTokens.error.module.message:The module does not exist'
              ),
              path: ['module'],
            },
          ],
        }
      );
    }

    return await generateAuthTokenSet({
      context,
      moduleId: String(input.module),
      user,
    });
  },
};

export default generateAuthTokens;
