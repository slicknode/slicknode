/**
 * Created by Ivo Meißner on 01.12.16.
 *
 */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { Validator } from '../type';
import {
  email,
  length,
  regex,
  gid,
  url,
  compareNumber,
  locale,
} from '../validators';
import _ from 'lodash';
import { ValidationError } from '../../errors';
/* eslint-disable no-unused-expressions */

const testValidator = (
  validator: Validator,
  validValues: Array<any>,
  invalidValues: Array<any>,
  config: {
    [x: string]: any;
  } = {}
) => {
  _.each(validValues, (value) => {
    it('succeeds validation for value ' + String(value), () => {
      expect(validator({ value }, 'value', (message) => message, config)).to.be
        .undefined;
    });
  });
  _.each(invalidValues, (value) => {
    it('fails validation for value ' + String(value), () => {
      expect(() => {
        validator({ value }, 'value', (message) => message, config);
      }).to.throw(ValidationError);
    });
  });
};

describe('Validator Tests:', () => {
  describe('Email', () => {
    testValidator(
      email,
      [
        'test@email.com',
        'CAMEL@EMAIL.com',
        'first.name.wef@my.somelongtlddomain',
      ],
      ['test @email.com', 'abc', 123, null]
    );
  });

  describe('Locale', () => {
    testValidator(
      locale,
      ['de', 'de-DE', 'en-US', 'en-UK'],
      ['de-de', 123, null, Infinity, 'de-DEXY', 'DE', 'de_DE']
    );
  });

  describe('Length', () => {
    testValidator(
      length,
      ['myst', '1234', '', '23'],
      ['12345', 'fivech', 123, null],
      {
        max: 4,
      }
    );

    testValidator(length, ['serghserg', '12345'], ['', '123', 123, null], {
      min: 4,
    });

    testValidator(
      length,
      ['serghsergf', '1234'],
      ['234', '12345678901', 123, null],
      {
        min: 4,
        max: 10,
      }
    );
  });

  describe('Regex', () => {
    testValidator(
      regex,
      ['abc', 'testabcd', 'ABCabc'],
      ['ABC', 'Abc', 123, null, 'aBcd'],
      {
        pattern: 'abc',
      }
    );

    testValidator(regex, ['abc'], ['', '123', 'abcd', 'gabcd', 123, null], {
      pattern: '^abc$',
    });

    testValidator(
      regex,
      ['serghsergf', 'xyz'],
      ['234', '', '12345678901', 123, null],
      {
        pattern: '^([a-z])+$',
      }
    );
  });

  describe('GID', () => {
    testValidator(
      gid,
      [
        'Rmlyc3RUeXBlOmU3NTJlM2UxLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // FirstType
        'U2Vjb25kVHlwZTplNzUyZTNlMi1lZmJmLTExZTYtYTczYi03YjA3YjcwY2VkODU', // SecondType
      ],
      [
        'e752e3e0-efbf-11e6-a73b-7b07b70ced85', // UUID
        'LkludmFsaWRUeXBlOmU3NTMwYWYwLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // Invalid type name
        'TXlUeXBlOjEyMw', // No UUID
        '123',
        'Test',
        '',
        123,
        null,
      ],
      {
        idType: 'uuid',
      }
    );

    // Test for specific type
    testValidator(
      gid,
      [
        'Rmlyc3RUeXBlOmU3NTJlM2UxLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // FirstType
      ],
      [
        'U2Vjb25kVHlwZTplNzUyZTNlMi1lZmJmLTExZTYtYTczYi03YjA3YjcwY2VkODU', // SecondType
        'e752e3e0-efbf-11e6-a73b-7b07b70ced85', // UUID
        'LkludmFsaWRUeXBlOmU3NTMwYWYwLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // Invalid type name
      ],
      {
        types: ['FirstType'],
        idType: 'uuid',
      }
    );

    // Test for multiple allowed types
    testValidator(
      gid,
      [
        'Rmlyc3RUeXBlOmU3NTJlM2UxLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // FirstType
        'U2Vjb25kVHlwZTplNzUyZTNlMi1lZmJmLTExZTYtYTczYi03YjA3YjcwY2VkODU', // SecondType
      ],
      [
        'e752e3e0-efbf-11e6-a73b-7b07b70ced85', // UUID
        'LkludmFsaWRUeXBlOmU3NTMwYWYwLWVmYmYtMTFlNi1hNzNiLTdiMDdiNzBjZWQ4NQ', // Invalid type name
      ],
      {
        types: ['FirstType', 'SecondType'],
        idType: 'uuid',
      }
    );
  });

  describe('compareNumber', () => {
    // Test gte
    testValidator(
      compareNumber,
      [10, 10.1, 1000, Infinity],
      ['string', null, -10, 0],
      {
        gte: 10,
      }
    );

    // Test gt
    testValidator(
      compareNumber,
      [10.1, 1000, Infinity],
      [10, 'string', null, -10, 0],
      {
        gt: 10,
      }
    );

    // Test lte
    testValidator(
      compareNumber,
      [10, -9.9, -100, -Infinity],
      ['string', null, 12, 10.1, Infinity],
      {
        lte: 10,
      }
    );

    // Test lt
    testValidator(
      compareNumber,
      [-9.9, -100, -Infinity],
      [10, 'string', null, 12, 10.1, Infinity],
      {
        lt: 10,
      }
    );

    // Combine multiple comparators
    testValidator(
      compareNumber,
      [-9.9, -10, 0, 9.9],
      [10, 'string', null, -100, 10.1, Infinity, -Infinity],
      {
        lt: 10,
        gte: -10,
      }
    );
  });

  describe('URL', () => {
    // Test default config
    testValidator(
      url,
      [
        'http://someurl',
        'https://subdomain.someurl.com',
        'https://subdomain.someurl.com/path/file.zip',
        'https://someurl.com',
      ],
      ['ftp://someurl', 'git://someurl', 'string', null, -10, 0],
      {}
    );

    // Test default config
    testValidator(
      url,
      [
        'http://someurl',
        'https://subdomain.someurl.com',
        'https://subdomain.someurl.com/path/file.zip',
        'https://someurl.com',
      ],
      ['ftp://someurl', 'git://someurl', 'string', null, -10, 0],
      {}
    );
  });
});
