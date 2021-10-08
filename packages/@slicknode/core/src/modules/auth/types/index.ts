/**
 * Created by Ivo Meißner on 13.12.16.
 *
 */

import User from './User';
import Role from './Role';
import PasswordResetToken from './PasswordResetToken';
import RefreshToken from './RefreshToken';
import AccessToken from './AccessToken';
import Login from './Login';

const types = [
  User,
  Role,
  PasswordResetToken,
  RefreshToken,
  AccessToken,
  Login,
];

export default types;
