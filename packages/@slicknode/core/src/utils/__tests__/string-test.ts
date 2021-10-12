import { describe, it } from 'mocha';
import { expect } from 'chai';
import { base64, unbase64 } from '../string';

describe('string utils', () => {
  describe('base64', () => {
    it('encodes string properly', () => {
      expect(base64('aGh&')).to.equal('YUdoJg==');
      expect(base64('öäÜF')).to.equal('w7bDpMOcRg==');
    });
  });

  describe('unbase64', () => {
    it('decodes string properly', () => {
      expect(unbase64('YUdoJg==')).to.equal('aGh&');
      expect(unbase64('w7bDpMOcRg==')).to.equal('öäÜF');
    });
  });
});
