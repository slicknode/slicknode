/**
 * Created by Ivo Meißner on 02.02.17.
 *
 */

import { MutationConfig } from '../../../definition';

import {
  getRefreshTokenId,
  AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from '../../../auth/utils';
import { Role } from '../../../auth';

/* eslint-disable max-len */

const logoutUser: MutationConfig = {
  name: 'logoutUser',
  inputFields: {
    refreshToken: {
      typeName: 'String',
      description: 'The refresh token to be invalidated',
    },
  },
  fields: {
    success: {
      typeName: 'Boolean',
      required: true,
    },
  },
  permissions: [
    {
      role: Role.ANONYMOUS,
    },
  ],
  async mutate(input, context) {
    const { req } = context;
    const id = getRefreshTokenId(
      // Read from input, or alternatively from cookie
      input.refreshToken ||
        (req.cookies && req.cookies[AUTH_REFRESH_COOKIE_NAME]),
      context
    );

    // Remove session cookie from client
    context.res.clearCookie(AUTH_COOKIE_NAME);
    context.res.clearCookie(AUTH_REFRESH_COOKIE_NAME);

    if (id) {
      // Delete auth token
      await context.db.RefreshToken.delete({
        id,
      });
    }

    return {
      success: true,
    };
  },
};

export default logoutUser;
