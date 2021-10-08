/**
 * Created by Ivo Meißner on 05.05.17.
 *
 */
import { FieldConfigMap } from '../../definition';

const AuthTokenFields: FieldConfigMap = {
  accessToken: {
    typeName: 'String',
    required: true,
    description: 'A temporary JWT access token',
  },
  accessTokenLifetime: {
    typeName: 'Int',
    required: true,
    description: 'The lifetime of the token in seconds',
  },
  refreshToken: {
    typeName: 'String',
    required: true,
    description:
      'A JWT refresh token that can be used to obtain the next access token',
  },
  refreshTokenLifetime: {
    typeName: 'Int',
    required: true,
    description: 'The lifetime of the token in seconds',
  },
};

export default AuthTokenFields;
