/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import { MutationConfig } from '../../../definition';

import Context from '../../../context';

import { checkPassword, generateAuthTokenSet } from '../../../auth/utils';

import User from '../../auth/types/User';
import authTokenFields from '../../auth/authTokenFields';
import { ValidationError } from '../../../errors';
import { Role } from '../../../auth';

const loginEmailPassword: MutationConfig = {
  name: 'loginEmailPassword',
  inputFields: {
    password: {
      ...User.fields.password,
      required: true,
    },
    email: {
      ...User.fields.email,
      required: true,
    },
  },
  fields: {
    ...authTokenFields,
    user: {
      typeName: 'User',
      required: true,
      description:
        'mutations.loginEmailPassword.fields.user.description:The logged in user',
    },
  },
  permissions: [
    {
      role: Role.ANONYMOUS,
    },
  ],
  async mutate(
    input: {
      [x: string]: any;
    },
    context: Context
  ) {
    const user = await context.db.User.find({
      email: input.email,
      isActive: true,
    });

    // If we have user and password is configured for that user, check password
    if (user && user.password) {
      const passwordValid = await checkPassword(input.password, user.password);
      if (passwordValid) {
        return {
          user,
          ...(await generateAuthTokenSet({
            user,
            context,
            moduleId: 'auth-email-password',
          })),
        };
      }
    }

    throw new ValidationError(
      context.res.__('Invalid email address and password combination')
    );
  },
};

export default loginEmailPassword;
