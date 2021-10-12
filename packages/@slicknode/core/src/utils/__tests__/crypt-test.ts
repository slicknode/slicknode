/**
 * Created by Ivo Meißner on 25.05.18
 *
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { decrypt, encrypt, secretKey } from '../crypt';

describe('crypt utils', () => {
  describe('secretKey', () => {
    it('generates secret key', (done) => {
      secretKey(16)
        .then((key) => {
          expect(key.length).to.equal(32);
          done();
        })
        .catch(done);
    });
  });

  describe('encrypt', () => {
    it('encrypts / decrypts value', async () => {
      const values = [{ test: 23 }, { nested: { deep: 23 } }];
      const secretKey = '123456789012345678901234567890';
      for (let value of values) {
        const encrypted = encrypt(value, secretKey);
        const decrypted = decrypt(encrypted, secretKey);
        expect(decrypted).to.deep.equal(value);
      }
    });
  });
});
