/**
 * Created by Ivo Meißner on 19.11.18
 *
 */

import { it, describe } from 'mocha';
import { expect } from 'chai';
import { normalizeEmail } from '../sanitizers';

describe('Sanitizers', () => {
  describe('normalizeEmail', () => {
    it('converts email to lowercase', () => {
      expect(normalizeEmail('SOME@EXAMPLE.com')).to.equal('some@example.com');
    });

    it('removes gmail dots', () => {
      expect(normalizeEmail('firstname.lastname@gmail.com')).to.equal(
        'firstnamelastname@gmail.com'
      );
    });

    it('removes googlemail dots', () => {
      expect(normalizeEmail('firstname.lastname@googlemail.com')).to.equal(
        'firstnamelastname@googlemail.com'
      );
    });

    it('allows gmail subaddress', () => {
      expect(normalizeEmail('mail+subaddress@googlemail.com')).to.equal(
        'mail+subaddress@googlemail.com'
      );
    });
  });
});
