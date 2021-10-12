/**
 * Created by Ivo Meißner on 24.12.17.
 *
 */

import { expect } from 'chai';
import httpMocks from 'node-mocks-http';
import getProjectAlias from '../getProjectAlias';

describe('getProjectAlias', () => {
  it('Reads alias from subdomain', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'testalias.some.domain.com',
      },
      originalUrl: '/',
    });

    const alias = getProjectAlias(request, 'https://{alias}.some.domain.com');
    expect(alias).to.equal('testalias');
  });

  it('Reads alias from subdomain with ending slash', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'testalias.some.domain.com',
      },
      originalUrl: '/',
    });

    const alias = getProjectAlias(request, 'https://{alias}.some.domain.com/');
    expect(alias).to.equal('testalias');
  });

  it('Reads alias from subdomain with ending slash and query parameters', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'testalias.some.domain.com',
      },
      originalUrl: '/?query=test',
    });

    const alias = getProjectAlias(request, 'https://{alias}.some.domain.com/');
    expect(alias).to.equal('testalias');
  });

  it('Reads alias from path with ending slash', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'some.domain.com',
      },
      originalUrl: '/v1/testalias',
    });

    const alias = getProjectAlias(
      request,
      'https://some.domain.com/v1/{alias}/'
    );
    expect(alias).to.equal('testalias');
  });

  it('Reads alias from path without ending slash', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'some.domain.com',
      },
      originalUrl: '/v1/testalias/',
    });

    const alias = getProjectAlias(
      request,
      'https://some.domain.com/v1/{alias}'
    );
    expect(alias).to.equal('testalias');
  });

  it('Reads alias from path with query parameters', () => {
    const request = httpMocks.createRequest!({
      headers: {
        host: 'some.domain.com',
      },
      originalUrl: '/v1/testalias/?query=34',
    });

    const alias = getProjectAlias(
      request,
      'https://some.domain.com/v1/{alias}'
    );
    expect(alias).to.equal('testalias');
  });
});
