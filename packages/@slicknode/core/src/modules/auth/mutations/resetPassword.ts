/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import { MutationConfig } from '../../../definition';

import authTokenFields from '../authTokenFields';

import Context from '../../../context';

import { generateAuthTokenSet, hashPassword } from '../../../auth/utils';

import { decodeResetToken } from '../utils';
import User from '../types/User';

import { AccessTokenInvalidError } from '../../../errors';
import { Role } from '../../../auth';

const resetPassword: MutationConfig = {
  name: 'resetPassword',
  inputFields: {
    resetToken: {
      typeName: 'String',
      required: true,
      description:
        'The reset token that was previously obtained via a password reset method',
    },
    password: {
      ...User.fields.password,
      required: true,
    },
  },
  fields: {
    ...authTokenFields,
  },
  permissions: [
    {
      role: Role.ANONYMOUS,
    },
  ],
  complexity: 500,
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    const { id, secret } = decodeResetToken(input.resetToken);

    if (id) {
      // Load token from DB
      const token = await context.db.PasswordResetToken.find({
        id,
        secret,
      });

      if (token && token.expires > new Date()) {
        // Hash password and update user object
        const password = await hashPassword(input.password);
        const user = await context.db.User.update(
          token.user,
          {
            password,
          },
          {
            requireResult: true,
          }
        );

        // Check if user is active
        if (user && user.isActive) {
          // Generate auth token set
          const authTokenSet = await generateAuthTokenSet({
            user,
            context,
            moduleId: 'auth',
          });

          // Delete expired and the used auth token
          await context.db.PasswordResetToken.delete(function () {
            this.where('expires', '<', new Date()).orWhereRaw(
              'id = ?::bigint',
              [id]
            );
          });

          return {
            ...authTokenSet,
          };
        }
      }
    }

    throw new AccessTokenInvalidError(
      context.res.__(
        'mutations.resetPassword.failure:Invalid reset token provided.'
      )
    );
  },
};

export default resetPassword;
