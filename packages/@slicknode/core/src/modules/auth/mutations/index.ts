/**
 * Created by Ivo Meißner on 13.12.16.
 *
 */

import logoutUser from './logoutUser';
import changeUserPassword from './changeUserPassword';
import createPasswordResetToken from './createPasswordResetToken';
import refreshAuthToken from './refreshAuthToken';
import resetPassword from './resetPassword';
import generateAuthTokens from './generateAuthTokens';

const mutations = [
  logoutUser,
  changeUserPassword,
  refreshAuthToken,
  createPasswordResetToken,
  resetPassword,
  generateAuthTokens,
];

export default mutations;
