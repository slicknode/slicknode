import {expect, test} from '../../test';
import * as auth from 'slicknode-auth-email-password';


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

describe('login', () => {
  test
    .stdout({stripColor: true})
    .stderr({stripColor: true})
    .stub(auth, 'default', () => () => Promise.resolve({
      accessToken: 'sef',
      accessTokenLifetime: 3456,
      refreshToken: 'sef',
      refreshTokenLifetime: 345,
    }))
    .prompt([ 'test@slicknode.com', 'somepassword34' ])
    .command(['login'])
    .it('logs user in successfully', ctx => {
      expect(ctx.stdout).to.contain('Login successful!');
    });
});
