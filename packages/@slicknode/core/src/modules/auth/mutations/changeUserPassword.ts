/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import { MutationConfig } from '../../../definition';
import authTokenFields from '../authTokenFields';

import Context from '../../../context';

import {
  checkPassword,
  generateAuthTokenSet,
  hashPassword,
} from '../../../auth/utils';

import User from '../types/User';
import { ValidationError } from '../../../errors';
import { Role } from '../../../auth';

const changeUserPassword: MutationConfig = {
  name: 'changeUserPassword',
  inputFields: {
    oldPassword: {
      ...User.fields.password,
    },
    newPassword: {
      ...User.fields.password,
    },
  },
  fields: {
    ...authTokenFields,
  },
  permissions: [
    {
      role: Role.AUTHENTICATED,
    },
  ],
  complexity: 100,
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    if (context.schemaBuilder.typeConfigs.User) {
      const userType = context.schemaBuilder.getObjectTypeConfig('User');
      if (userType.handler) {
        // Load user from DB
        const user = await context.db.User.find({
          id: context.auth.uid,
        });
        if (!user) {
          throw new Error('User was not found');
        }

        // Check password
        const passwordValid = await checkPassword(
          input.oldPassword,
          user.password
        );
        if (!passwordValid) {
          throw new ValidationError(
            context.res.__(
              'mutations.changeUserPassword.inputFields.oldPassword.errorMessage:The old password is incorrect'
            )
          );
        }

        // Generate new PW hash and update user
        const password = await hashPassword(input.newPassword);
        const updatedUser = await context.db.User.update(user.id, { password });

        return {
          user: updatedUser,
          ...(await generateAuthTokenSet({
            user: updatedUser,
            context,
            moduleId: 'auth',
          })),
        };
      }
    }
    throw new Error('No handler defined for User type');
  },
};

export default changeUserPassword;
