import {url} from '../url';
import {expect} from 'chai';

describe('url input parser', () => {
  it('parses valid URL with default params', () => {
    const parser = url();
    const value = 'http://slicknode.com';
    expect(parser(value)).to.equal(value);
  });

  it('throws error for invalid URL', () => {
    const parser = url();
    const value = 'invalidurl';
    expect(() => parser(value)).to.throw('Value "invalidurl" is not a valid URL');
  });

  it('throws custom error message', () => {
    const message = 'Enter correct value';
    const parser = url({
      message,
    });
    const value = 'invalidurl';
    expect(() => parser(value)).to.throw(message);
  });

  it('passes options to validator', () => {
    const parser = url({
      protocols: ['https'],
    });
    const value = 'http://slicknode.com';
    expect(() => parser(value)).to.throw('Value "http://slicknode.com" is not a valid URL');
  });
});
