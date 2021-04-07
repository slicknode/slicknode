import { expect, test } from '../../test';
import sinon, { SinonStub } from 'sinon';
import * as utils from '../../../src/utils';
import { CREATE_API_AUTH_REQUEST_MUTATION, LOGIN_API_AUTH_REQUEST_MUTATION } from '../../../src/base/base-command';


const LOGIN_MUTATION = `mutation LoginMutation(
  $email: String!,
  $password: String!
) {
  tokenSet: loginEmailPassword(input: {email: $email, password: $password}) {
    accessToken
    refreshToken
    accessTokenLifetime
    refreshTokenLifetime
  }
}`;
const DUMMY_AUTH_URL = 'http://some-auth-url';

describe('login', () => {
  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .nock(
      'http://localhost',
      loader => loader.post('/').reply(403)
    )
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
    .do((ctx: { stub?: SinonStub }) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['login'])
    .finally(ctx => {
      ctx.stub!.restore();
    })
    .it('logs user in successfully', ctx => {
      expect(ctx.stdout).to.contain('Login successful!');
      expect(ctx.stub!.calledWith(DUMMY_AUTH_URL)).to.be.true;
    });

  test
    .stdout({ stripColor: true })
    .stderr({ stripColor: true })
    .nock(
      'http://localhost',
      loader => loader.post('/').reply(403)
    )
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
    .do((ctx: { stub?: SinonStub }) => {
      ctx.stub = sinon.stub(utils, 'openUrl');
    })
    .command(['login'])
    .catch(/Error creating auth request: Please try again/g)
    .finally(ctx => {
      ctx.stub!.restore();
    })
    .it('throws error if API auth request cannot be created', () => { });
});
