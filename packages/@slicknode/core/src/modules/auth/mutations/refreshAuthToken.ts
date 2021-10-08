/**
 * Created by Ivo Meißner on 27.01.17.
 *
 */

import { MutationConfig } from '../../../definition';

import authTokenFields from '../authTokenFields';

import Context from '../../../context';

import {
  AUTH_REFRESH_COOKIE_NAME,
  generateAuthTokenSet,
  getRefreshTokenId,
} from '../../../auth/utils';

import { AccessTokenInvalidError } from '../../../errors';
import { Role } from '../../../auth';

const refreshAuthToken: MutationConfig = {
  name: 'refreshAuthToken',
  inputFields: {
    refreshToken: {
      typeName: 'String',
      required: false,
      description:
        'The refresh token that was previously obtained via a login method',
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
    const { req } = context;
    const id = getRefreshTokenId(
      // Read from input, or alternatively from cookie
      input.refreshToken ||
        (req.cookies && req.cookies[AUTH_REFRESH_COOKIE_NAME]),
      context
    );

    if (id) {
      // Load token from DB
      const token = await context.db.RefreshToken.find({ id });
      if (token) {
        // Check if token is expired in database
        if (token.expires > new Date()) {
          // Load user
          const user = await context.db.User.find({ id: token.user });

          // @TODO: Check if user agent matches, if geo IP is invalid

          // Check if user is active
          if (user && user.isActive) {
            const authTokenSet = await generateAuthTokenSet({
              user,
              context,
              moduleId: 'auth',
            });

            // Delete current auth token
            await context.db.RefreshToken.delete({ id });

            return {
              ...authTokenSet,
            };
          }
        }
      }
    }

    throw new AccessTokenInvalidError(
      context.res.__(
        'mutations.refreshAuthToken.failure:Invalid refresh token provided. Please login again.'
      )
    );
  },
};

export default refreshAuthToken;
