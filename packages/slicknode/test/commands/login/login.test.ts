import { expect, test } from '../../test';
import * as sinon from 'sinon';
import {
  CREATE_API_AUTH_REQUEST_MUTATION,
  LOGIN_API_AUTH_REQUEST_MUTATION,
} from '../../../src/base/base-command';
import { default as LoginCommand } from '../../../src/commands/login';

const DUMMY_AUTH_URL = 'http://some-auth-url';

describe('login', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login() // We login to stub client
    .api(CREATE_API_AUTH_REQUEST_MUTATION, {
      data: {
        createApiAuthRequest: {
          node: {
            token: 'abc',
          },
          authUrl: DUMMY_AUTH_URL,
        },
      },
    })
    .api(LOGIN_API_AUTH_REQUEST_MUTATION, {
      data: {
        loginApiAuthRequest: {
          accessToken: 'abc123',
          accessTokenLifetime: 10,
          refreshToken: 'xyz123',
          refreshTokenLifetime: 10,
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(LoginCommand.prototype, 'openUrl');
    })
    .command(['login'])
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('logs user in successfully', (ctx) => {
      expect(ctx.stdout).to.contain('Login successful!');
      expect(ctx.stub!.calledWith(DUMMY_AUTH_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .login() // We login to stub client
    .api(CREATE_API_AUTH_REQUEST_MUTATION, {
      data: {
        createApiAuthRequest: {
          node: {
            token: null,
          },
          authUrl: DUMMY_AUTH_URL,
        },
      },
    })
    .do((ctx: { stub?: sinon.SinonStub }) => {
      ctx.stub = sinon.stub(LoginCommand.prototype, 'openUrl');
    })
    .command(['login'])
    .catch(/Error creating auth request: Please try again/g)
    .finally((ctx) => {
      ctx.stub!.restore();
    })
    .it('throws error if API auth request cannot be created', () => {});
});
