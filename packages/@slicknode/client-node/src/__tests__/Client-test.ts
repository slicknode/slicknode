/**
 * Created by Ivo Meißner on 06.08.17.
 */

import nock from 'nock';
import Client, { LOGOUT_MUTATION, REFRESH_TOKEN_MUTATION } from '../index';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { parse, print } from 'graphql';

const endpoint = 'https://dummyhost';

describe('Client', () => {
  it('Should send a request without auth tokens', async () => {
    const client = new Client({ endpoint });
    const query = 'query Node($id: ID!) { node(id: $id) {id}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('converts GraphQL DocumentNode to query string', async () => {
    const client = new Client({ endpoint });
    const query = parse('query Node($id: ID!) { node(id: $id) {id}}');
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query: print(query),
        variables,
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should send a request with operationName', async () => {
    const client = new Client({ endpoint });
    const query =
      'query Node($id: ID!) { node(id: $id) {id: "123"}} query SomeOtherQuery{viewer{user{id}}}';
    const operationName = 'Node';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query,
        variables,
        operationName,
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables, operationName);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should upload files from string', async () => {
    const client = new Client({ endpoint });
    const query = 'query Node($id: ID!) { node(id: $id) {id}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint)
      .post('/', (body: any) => {
        return (
          String(body).includes(
            'Content-Disposition: form-data; name="variables"\r\n\r\n{"id":"123"}'
          ) &&
          String(body).includes(
            `Content-Disposition: form-data; name="query"\r\n\r\n${query}`
          ) &&
          String(body).includes(
            'Content-Disposition: form-data; name="file"; filename="data.bin"\r\nContent-Type: application/octet-stream\r\n\r\nabcdef'
          )
        );
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables, null, {
      file: 'abcdef',
    });

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should upload files from string with GraphQL Query document', async () => {
    const client = new Client({ endpoint });
    const query = parse('query Node($id: ID!) { node(id: $id) {id}}');
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint)
      .post('/', (body: any) => {
        return (
          String(body).includes(
            'Content-Disposition: form-data; name="variables"\r\n\r\n{"id":"123"}'
          ) &&
          String(body).includes(
            `Content-Disposition: form-data; name="query"\r\n\r\n${print(
              query
            )}`
          ) &&
          String(body).includes(
            'Content-Disposition: form-data; name="file"; filename="data.bin"\r\nContent-Type: application/octet-stream\r\n\r\nabcdef'
          )
        );
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables, null, {
      file: 'abcdef',
    });

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should upload files from Buffer', async () => {
    const client = new Client({ endpoint });
    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint)
      .post('/', (body: any) => {
        return (
          String(body).includes(
            'Content-Disposition: form-data; name="variables"\r\n\r\n{"id":"123"}'
          ) &&
          String(body).includes(
            `Content-Disposition: form-data; name="query"\r\n\r\n${query}`
          ) &&
          String(body).includes(
            'Content-Disposition: form-data; name="file"; filename="data.bin"\r\nContent-Type: application/octet-stream\r\n\r\nbuffer'
          )
        );
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables, null, {
      file: Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]),
    });

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should throw an error with no provided endpoint', () => {
    /* eslint-disable no-unused-vars */
    expect(() => {
      // $FlowFixMe:
      const client = new Client(null);
    }).to.throw(
      'You have to provide the endpoint of the GraphQL server to the client'
    );

    expect(() => {
      // $FlowFixMe
      const client = new Client({ endpoint: null });
    }).to.throw(
      'You have to provide the endpoint of the GraphQL server to the client'
    );
    /* eslint-enable no-unused-vars */
  });

  it('Should send access token in header', async () => {
    const client = new Client({ endpoint });

    const accessToken = '12345abcde';
    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      reqheaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    client.setAuthTokenSet({
      accessToken,
      accessTokenLifetime: 10,
      refreshToken: '213',
      refreshTokenLifetime: 10,
    });

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should send permanent access token in header', async () => {
    const accessToken = '12345abcde';
    const client = new Client({
      endpoint,
      accessToken,
    });

    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      reqheaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should clear tokens on logout', async () => {
    const client = new Client({ endpoint });

    const accessToken = '12345abcde';
    const refreshToken = 'refreshToken123';

    const logoutVariables = { refreshToken };
    const logoutResult = { data: { logoutUser: { success: true } } };
    const logoutRequest = nock(endpoint)
      .post('/', {
        query: LOGOUT_MUTATION,
        variables: logoutVariables,
      })
      .reply(200, logoutResult);

    client.setAuthTokenSet({
      accessToken,
      accessTokenLifetime: 10,
      refreshToken: refreshToken,
      refreshTokenLifetime: 10,
    });
    await client.logout();
    logoutRequest.done();

    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should not send expired access token in header', async () => {
    const client = new Client({ endpoint });

    const accessToken = '12345abcde';
    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    client.setAuthTokenSet({
      accessToken,
      accessTokenLifetime: -1,
      refreshToken: '213',
      refreshTokenLifetime: -1,
    });

    const clientResult = await client.fetch(query, variables);

    request.done();
    expect(result).to.deep.equal(clientResult);
  });

  it('Should refresh access token', async () => {
    const client = new Client({ endpoint });

    const refreshAuthToken = {
      accessToken: 'newToken',
      accessTokenLifetime: 23,
      refreshToken: 'newRefreshToken',
      refreshTokenLifetime: 10,
    };
    const refreshToken = 'refresh123';
    const refreshResult = { data: { refreshAuthToken } };
    const refreshTokenReq = nock(endpoint, {
      badheaders: ['Authorization'],
    })
      .post('/', {
        query: REFRESH_TOKEN_MUTATION,
        variables: {
          token: refreshToken,
        },
      })
      .reply(200, refreshResult);

    const query = 'query Node($id: ID!) { node(id: $id) {id: "123"}}';
    const variables = { id: '123' };
    const result = { data: { node: { id: '123' } } };
    const request = nock(endpoint, {
      reqheaders: {
        Authorization: `Bearer ${refreshAuthToken.accessToken}`,
      },
    })
      .post('/', {
        query,
        variables,
      })
      .reply(200, result);

    client.setAuthTokenSet({
      accessToken: 'expiredtoken',
      accessTokenLifetime: -1,
      refreshToken,
      refreshTokenLifetime: 10,
    });

    const clientResult = await client.fetch(query, variables);

    refreshTokenReq.done();
    request.done();
    expect(result).to.deep.equal(clientResult);

    expect(client.getAccessTokenExpires()).to.be.above(Date.now());
    expect(client.getRefreshTokenExpires()).to.be.above(Date.now());
    expect(client.getRefreshToken()).to.equal(refreshAuthToken.refreshToken);
    expect(client.getAccessToken()).to.equal(refreshAuthToken.accessToken);
  });
});
