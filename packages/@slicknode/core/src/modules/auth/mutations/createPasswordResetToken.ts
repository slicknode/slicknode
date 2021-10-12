/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import { MutationConfig } from '../../../definition';

import { encodeResetToken, PasswordResetToken } from '../utils';

import Context from '../../../context';

import { randomPassword } from '../../../auth/utils';

import { ValidationError } from '../../../errors';
import { Role } from '../../../auth';

const createPasswordResetToken: MutationConfig = {
  name: 'createPasswordResetToken',
  inputFields: {
    user: {
      typeName: 'ID',
      required: true,
      description:
        'The ID of the user that the password reset token is assigned to',
      validators: [
        {
          type: 'gid',
          config: {
            types: 'User',
          },
        },
      ],
    },
    lifetime: {
      typeName: 'Int',
      description:
        'Lifetime of the token in seconds. If no lifetime is specified, the default of 3600 (1 hour) is used',
      defaultValue: 3600,
      validators: [
        {
          type: 'compareNumber',
          config: {
            gt: 0,
            lte: 60 * 60 * 24,
          },
        },
      ],
    },
  },
  fields: {
    resetToken: {
      typeName: 'String',
      required: true,
      description:
        'The reset token that can be used to reset the password of the user',
    },
  },
  // Only other modules can create reset token, no user can do so directly
  permissions: [
    {
      role: Role.RUNTIME,
    },
  ],
  complexity: 500,
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    // Check if user is active
    const user = await context.db.User.find({
      id: context.fromGlobalId(input.user).id,
      isActive: true,
    });
    if (!user) {
      throw new ValidationError(
        context.res.__(
          'mutations.createPasswordResetToken.error.message:The token could not be generated'
        ),
        {
          input: [
            {
              message: context.res.__(
                'mutations.createPasswordResetToken.error.name.message:The user could not be found in the system'
              ),
              path: ['user'],
            },
          ],
        }
      );
    }

    const secret = randomPassword(32);
    const resetToken = (await context.db.PasswordResetToken.create({
      expires: new Date(new Date().getTime() + input.lifetime * 1000),
      secret,
      user: user.id,
    })) as PasswordResetToken;

    return {
      resetToken: encodeResetToken(resetToken),
    };
  },
};

export default createPasswordResetToken;
